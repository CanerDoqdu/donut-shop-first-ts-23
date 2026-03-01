import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { metrics } from '@/lib/metrics';

// Mock security so we can control validateOrigin per test
const mockValidateOrigin = vi.hoisted(() => vi.fn().mockReturnValue(null));
vi.mock('@/lib/security', () => ({ validateOrigin: mockValidateOrigin }));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => {
    cb({
      setTag: vi.fn(),
      setLevel: vi.fn(),
      setExtras: vi.fn(),
    });
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

function makeRequest(path: string, method = 'POST'): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method });
}

describe('withHandler — metrics integration', () => {
  beforeEach(() => {
    metrics.reset();
    mockValidateOrigin.mockClear();
    mockValidateOrigin.mockReturnValue(null);
  });

  it('records latency on successful response', async () => {
    const handler = withHandler(async () => {
      return NextResponse.json({ ok: true });
    });

    await handler(makeRequest('/api/products'));

    const summary = metrics.getEndpointSummary('/api/products');
    expect(summary.totalRequests).toBe(1);
    expect(summary.latency.count).toBe(1);
    expect(summary.errorCount).toBe(0);
  });

  it('records checkout success outcome on 2xx', async () => {
    const handler = withHandler(async () => {
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    await handler(makeRequest('/api/checkout'));

    const checkout = metrics.getCheckoutSummary();
    expect(checkout.total).toBe(1);
    expect(checkout.successRate).toBe(1);
  });

  it('records error metric on ApiError', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_RATE_LIMITED', 'Rate limited', 429);
    });

    await handler(makeRequest('/api/products'));

    const summary = metrics.getEndpointSummary('/api/products');
    expect(summary.errorCount).toBe(1);
    expect(summary.totalRequests).toBe(1);
  });

  it('records validation_fail checkout outcome', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_VALIDATION_FAILED', 'Bad input', 400);
    });

    await handler(makeRequest('/api/checkout'));

    const checkout = metrics.getCheckoutSummary();
    expect(checkout.total).toBe(1);
    expect(checkout.validationFailRate).toBe(1);
  });

  it('records timeout checkout outcome on 408', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('TIMEOUT', 'Request timed out', 408);
    });

    await handler(makeRequest('/api/checkout'));

    const checkout = metrics.getCheckoutSummary();
    expect(checkout.total).toBe(1);
    expect(checkout.timeoutRate).toBe(1);
  });

  it('records generic error checkout outcome on unhandled error', async () => {
    const handler = withHandler(async () => {
      throw new Error('unexpected crash');
    });

    await handler(makeRequest('/api/checkout'));

    const checkout = metrics.getCheckoutSummary();
    expect(checkout.total).toBe(1);
    expect(checkout.errorRate).toBe(1);
  });

  it('records error checkout outcome on non-validation ApiError', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_STRIPE_CHECKOUT_FAILED', 'Stripe error', 502);
    });

    await handler(makeRequest('/api/checkout'));

    const checkout = metrics.getCheckoutSummary();
    expect(checkout.total).toBe(1);
    expect(checkout.errorRate).toBe(1);
  });

  it('does not record checkout outcome for non-checkout endpoints', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('NOT_FOUND', 'Not found', 404);
    });

    await handler(makeRequest('/api/products'));

    const checkout = metrics.getCheckoutSummary();
    expect(checkout.total).toBe(0);
  });

  it('attaches x-request-id and x-correlation-id headers on success', async () => {
    const handler = withHandler(async () => {
      return NextResponse.json({ ok: true });
    });

    const res = await handler(makeRequest('/api/products'));
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(res.headers.get('x-correlation-id')).toBeTruthy();
  });

  it('returns 500 for unhandled errors (non-ApiError)', async () => {
    const handler = withHandler(async () => {
      throw new Error('unhandled');
    });

    const res = await handler(makeRequest('/api/products'));
    expect(res.status).toBe(500);
  });

  it('returns 403 when CSRF validation rejects the request', async () => {
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden: origin not allowed' }, { status: 403 }),
    );

    const handler = withHandler(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeRequest('/api/products', 'POST'));

    expect(res.status).toBe(403);
  });

  it('skips CSRF validation when skipCsrf option is true', async () => {
    // Even if validateOrigin would reject, skipCsrf=true bypasses the check
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );

    const handler = withHandler(
      async () => NextResponse.json({ ok: true }),
      'api',
      { skipCsrf: true },
    );
    const res = await handler(makeRequest('/api/products', 'POST'));

    expect(res.status).toBe(200);
  });

  it('skips CSRF validation for GET requests', async () => {
    const handler = withHandler(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeRequest('/api/products', 'GET'));

    expect(res.status).toBe(200);
    expect(mockValidateOrigin).not.toHaveBeenCalled();
  });

  it('forwards ApiError.headers to the error response (e.g. Retry-After)', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_RATE_LIMITED', 'Slow down', 429, {
        headers: { 'Retry-After': '60' },
      });
    });

    const res = await handler(makeRequest('/api/products', 'GET'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('uses E_INTERNAL error code for unhandled (non-ApiError) exceptions', async () => {
    const handler = withHandler(async () => {
      throw new TypeError('unexpected null reference');
    });

    const res = await handler(makeRequest('/api/products', 'GET'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('E_INTERNAL');
    expect(body.message).toBe('An unexpected error occurred');
    expect(body.requestId).toBeTruthy();
  });
});
