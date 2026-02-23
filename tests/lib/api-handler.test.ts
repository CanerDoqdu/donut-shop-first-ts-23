import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { metrics } from '@/lib/metrics';

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
});
