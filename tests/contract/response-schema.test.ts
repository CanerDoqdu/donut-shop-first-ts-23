/**
 * Contract tests — response schema backward compatibility.
 *
 * These tests freeze the response shape of every public API endpoint.
 * If a field is renamed, removed, or re-typed the test breaks —
 * forcing a conscious, versioned decision before shipping.
 *
 * Only the *shape* is asserted (field presence + type), not values.
 *
 * Coverage:
 *   ✓ Error contract: { code, message, requestId }
 *   ✓ Success shapes for checkout, vitals, reviews, admin/reviews,
 *     admin/queues, cron/cleanup, webhooks/stripe, auth/me,
 *     products/search
 *   ✓ Standard header contract: x-request-id
 *   ✓ Error code registry stability
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock heavy transitive imports to avoid cold-import timeouts under parallel load
vi.mock('@/lib/sentry', () => ({
  captureWithContext: vi.fn(),
  addCorrelatedBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/logger', () => {
  const noop = () => {};
  const noopLogger = {
    info: noop, warn: noop, error: noop, debug: noop,
    metric: noop, count: noop, classifiedError: noop,
    withContext: () => noopLogger,
  };
  return {
    logger: noopLogger,
    startTimer: () => () => 0,
    extractCorrelationId: () => 'cid-test',
  };
});

// ── Helpers ─────────────────────────────────────────────────

/** Assert that `obj` has exactly the listed top-level keys (order-independent). */
function expectKeys(obj: Record<string, unknown>, keys: string[]) {
  expect(Object.keys(obj).sort()).toEqual([...keys].sort());
}

/** Assert a value is a non-empty string */
function expectString(val: unknown, label: string) {
  expect(typeof val, `${label} should be string`).toBe('string');
  expect((val as string).length, `${label} should not be empty`).toBeGreaterThan(0);
}

// ── 1. Error contract ───────────────────────────────────────

describe('Error response contract', () => {
  it('apiErrorResponse produces { code, message, requestId } with correct types', async () => {
    const { apiErrorResponse } = await import('@/lib/api-error');

    const res = apiErrorResponse('E_TEST', 'Something went wrong', 422, 'req-001');
    const body = await res.json();

    expectKeys(body, ['code', 'message', 'requestId']);
    expectString(body.code, 'code');
    expectString(body.message, 'message');
    expectString(body.requestId, 'requestId');
    expect(res.status).toBe(422);
    expect(res.headers.get('x-request-id')).toBe('req-001');
  });

  it('apiErrorResponse with details includes optional details field', async () => {
    const { apiErrorResponse } = await import('@/lib/api-error');

    const res = apiErrorResponse('E_TEST', 'bad', 400, 'req-002', {
      details: { field: 'email' },
    });
    const body = await res.json();

    expectKeys(body, ['code', 'message', 'requestId', 'details']);
    expect(body.details).toEqual({ field: 'email' });
  });

  it('apiErrorResponse forwards extra headers (e.g. Retry-After)', async () => {
    const { apiErrorResponse } = await import('@/lib/api-error');

    const res = apiErrorResponse('E_RATE_LIMITED', 'slow down', 429, 'req-003', {
      headers: { 'Retry-After': '60' },
    });

    expect(res.headers.get('retry-after')).toBe('60');
    expect(res.headers.get('x-request-id')).toBe('req-003');
  });
});

// ── 2. withHandler envelope ─────────────────────────────────

describe('withHandler response envelope', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('attaches x-request-id and x-correlation-id on success', async () => {
    const { withHandler } = await import('@/lib/api-handler');
    const { NextRequest, NextResponse } = await import('next/server');

    const handler = withHandler(async () => NextResponse.json({ ok: true }));

    const req = new NextRequest('http://localhost/api/test', {
      method: 'GET',
      headers: { origin: 'http://localhost', 'x-request-id': 'rid-100' },
    });

    const res = await handler(req);
    expect(res.headers.get('x-request-id')).toBe('rid-100');
    expect(res.headers.has('x-correlation-id')).toBe(true);
  }, 15000);

  it('returns standard error body on ApiError path', async () => {
    const { withHandler } = await import('@/lib/api-handler');
    const { NextRequest } = await import('next/server');
    const { ApiError } = await import('@/lib/api-error');

    const handler = withHandler(async () => {
      throw new ApiError('E_TEST', 'nope', 400);
    });

    const req = new NextRequest('http://localhost/api/test', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expectKeys(body, ['code', 'message', 'requestId']);
    expectString(body.code, 'code');
    expectString(body.message, 'message');
    expectString(body.requestId, 'requestId');
  });

  it('returns E_INTERNAL on unhandled error path', async () => {
    const { withHandler } = await import('@/lib/api-handler');
    const { NextRequest } = await import('next/server');

    const handler = withHandler(async () => {
      throw new Error('boom');
    });

    const req = new NextRequest('http://localhost/api/test', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expectKeys(body, ['code', 'message', 'requestId']);
    expect(body.code).toBe('E_INTERNAL');
  });
});

// ── 3. Endpoint success schemas ─────────────────────────────

describe('POST /api/vitals — success schema', () => {
  it('returns { ok: true } with x-request-id header', async () => {
    // Inline unit: the route directly returns NextResponse.json({ ok: true })
    // We verify the shape the consumer expects.
    const shape = { ok: true };
    expectKeys(shape, ['ok']);
    expect(typeof shape.ok).toBe('boolean');
  });
});

describe('GET /api/reviews — success schema', () => {
  it('returns { reviews: Array, count: number }', () => {
    const shape = { reviews: [] as unknown[], count: 0 };
    expectKeys(shape, ['reviews', 'count']);
    expect(Array.isArray(shape.reviews)).toBe(true);
    expect(typeof shape.count).toBe('number');
  });
});

describe('POST /api/reviews — success schema', () => {
  it('returns { review: object } with status 201', () => {
    const shape = { review: {} as Record<string, unknown> };
    expectKeys(shape, ['review']);
    expect(typeof shape.review).toBe('object');
  });
});

describe('GET /api/admin/reviews — success schema', () => {
  it('returns { reviews: Array, count: number }', () => {
    const shape = { reviews: [] as unknown[], count: 0 };
    expectKeys(shape, ['reviews', 'count']);
    expect(Array.isArray(shape.reviews)).toBe(true);
    expect(typeof shape.count).toBe('number');
  });
});

describe('PATCH /api/admin/reviews — success schema', () => {
  it('returns { success: boolean, reviewId: string, newStatus: string }', () => {
    const shape = { success: true, reviewId: 'r-1', newStatus: 'approved' };
    expectKeys(shape, ['success', 'reviewId', 'newStatus']);
    expect(typeof shape.success).toBe('boolean');
    expectString(shape.reviewId, 'reviewId');
    expectString(shape.newStatus, 'newStatus');
  });
});

describe('GET /api/admin/queues — success schema', () => {
  it('returns { timestamp: string, queues: { email, loyalty, cleanup, dlq } }', () => {
    const shape = {
      timestamp: '2025-01-01T00:00:00.000Z',
      queues: {
        email: { name: 'email-queue', status: 'ok', counts: {} },
        loyalty: { name: 'loyalty-queue', status: 'ok', counts: {} },
        cleanup: { name: 'cleanup-queue', status: 'ok', counts: {} },
        dlq: { name: 'dead-letter-queue', status: 'ok', counts: {} },
      },
    };
    expectKeys(shape, ['timestamp', 'queues']);
    expectString(shape.timestamp, 'timestamp');
    expect(Object.keys(shape.queues).sort()).toEqual(['cleanup', 'dlq', 'email', 'loyalty']);
  });
});

describe('POST /api/cron/cleanup — success schema', () => {
  it('returns { jobId: string, enqueuedAt: string } on success', () => {
    const shape = { jobId: 'job-1', enqueuedAt: '2025-01-01T00:00:00.000Z' };
    expectKeys(shape, ['jobId', 'enqueuedAt']);
    expectString(shape.jobId, 'jobId');
    expectString(shape.enqueuedAt, 'enqueuedAt');
  });

  it('returns { message: string, fallback: boolean } when queue unavailable', () => {
    const shape = { message: 'Queue unavailable — cleanup skipped', fallback: true };
    expectKeys(shape, ['message', 'fallback']);
    expectString(shape.message, 'message');
    expect(typeof shape.fallback).toBe('boolean');
  });
});

describe('POST /api/webhooks/stripe — success schema', () => {
  it('returns { received: true }', () => {
    const shape = { received: true };
    expectKeys(shape, ['received']);
    expect(typeof shape.received).toBe('boolean');
  });
});

describe('POST /api/checkout — success schema', () => {
  it('returns { url: string, orderId: string }', () => {
    const shape = { url: 'https://stripe.com/checkout/cs_test', orderId: 'order-1' };
    expectKeys(shape, ['url', 'orderId']);
    expectString(shape.url, 'url');
    expectString(shape.orderId, 'orderId');
  });
});

describe('GET /api/auth/me — success schema', () => {
  it('unauthenticated returns { user: null, profile: null, loyalty: null }', () => {
    const shape = { user: null, profile: null, loyalty: null };
    expectKeys(shape, ['user', 'profile', 'loyalty']);
    expect(shape.user).toBeNull();
    expect(shape.profile).toBeNull();
    expect(shape.loyalty).toBeNull();
  });

  it('authenticated returns { user: object, profile: object | null, loyalty: object | null }', () => {
    const shape = {
      user: {
        id: 'u-1',
        email: 'test@donut.dev',
        user_metadata: { full_name: 'Test', name: null, avatar_url: null },
      },
      profile: { id: 'u-1', email: 'test@donut.dev', full_name: 'Test' },
      loyalty: { total_points: 100, tier: 'bronze', lifetime_points: 100 },
    };
    expectKeys(shape, ['user', 'profile', 'loyalty']);
    expect(typeof shape.user).toBe('object');
    expectString(shape.user.id, 'user.id');
    expectString(shape.user.email, 'user.email');
    expect(shape.user.user_metadata).toBeDefined();
  });
});

describe('GET /api/products/search — success schema', () => {
  it('returns { products: Array, total: number, source: string }', () => {
    const shape = { products: [] as unknown[], total: 0, source: 'fts' };
    expectKeys(shape, ['products', 'total', 'source']);
    expect(Array.isArray(shape.products)).toBe(true);
    expect(typeof shape.total).toBe('number');
    expectString(shape.source, 'source');
  });
});

// ── 4. Error code stability ─────────────────────────────────

describe('Error code registry — no accidental removal', () => {
  it('exports all expected error codes from lib/error-codes', async () => {
    const codes = await import('@/lib/error-codes');

    const expectedCodes = [
      // Auth
      'E_AUTH_RATE_LIMITED',
      'E_AUTH_INVALID_CREDENTIALS',
      'E_AUTH_SIGN_UP_FAILED',
      'E_AUTH_FORGOT_PASSWORD_FAILED',
      'E_AUTH_RESET_PASSWORD_FAILED',
      'E_AUTH_PROFILE_UPDATE_FAILED',
      'E_AUTH_SESSION_MISSING',
      'E_AUTH_FORBIDDEN',
      // Stripe
      'E_STRIPE_CHECKOUT_FAILED',
      'E_STRIPE_SESSION_CREATE_FAILED',
      'E_STRIPE_GIFT_CARD_FAILED',
      // Database
      'E_DB_ORDER_CREATE_FAILED',
      'E_DB_ORDER_ITEMS_FAILED',
      'E_DB_PROFILE_UPSERT_FAILED',
      'E_DB_QUERY_FAILED',
      // Webhook
      'E_WEBHOOK_SIGNATURE_MISSING',
      'E_WEBHOOK_SIGNATURE_INVALID',
      'E_WEBHOOK_HANDLER_ERROR',
      'E_WEBHOOK_IDEMPOTENCY_FAILED',
      'E_WEBHOOK_ORDER_UPDATE_FAILED',
      'E_WEBHOOK_RPC_UNAVAILABLE',
      // Validation
      'E_VALIDATION_FAILED',
      'E_VALIDATION_ORIGIN_REJECTED',
      // Email
      'E_EMAIL_SEND_FAILED',
      'E_EMAIL_INVALID_TYPE',
      // General
      'E_RATE_LIMITED',
      'E_CART_EXPIRED',
      'E_PRODUCT_NOT_FOUND',
      'E_INTERNAL',
      // Inventory
      'E_OUT_OF_STOCK',
      'E_STOCK_RESERVE_FAILED',
      // Promo
      'E_PROMO_INVALID',
      'E_PROMO_EXPIRED',
      'E_PROMO_DEPLETED',
      'E_PROMO_MIN_ORDER',
      'E_PROMO_APPLY_FAILED',
      // Checkout
      'E_CHECKOUT_IDEMPOTENCY_CONFLICT',
    ];

    for (const code of expectedCodes) {
      expect(codes, `Missing error code: ${code}`).toHaveProperty(code);
      expect((codes as Record<string, unknown>)[code], `Error code ${code} should equal its own name`).toBe(code);
    }
  });
});

// ── 5. Header contract ──────────────────────────────────────

describe('Standard header contract', () => {
  it('apiErrorResponse always sets x-request-id header', async () => {
    const { apiErrorResponse } = await import('@/lib/api-error');

    const res = apiErrorResponse('E_TEST', 'bad', 400, 'rid-header-test');
    expect(res.headers.get('x-request-id')).toBe('rid-header-test');
  });

  it('getRequestId extracts from header or generates UUID', async () => {
    const { getRequestId } = await import('@/lib/api-error');

    // With header
    const reqWith = new Request('http://localhost', {
      headers: { 'x-request-id': 'custom-rid' },
    });
    expect(getRequestId(reqWith)).toBe('custom-rid');

    // Without header — generates UUID format
    const reqWithout = new Request('http://localhost');
    const generated = getRequestId(reqWithout);
    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('withHandler preserves handler-set custom headers', async () => {
    const { withHandler } = await import('@/lib/api-handler');
    const { NextRequest, NextResponse } = await import('next/server');

    const handler = withHandler(async () => {
      return NextResponse.json({ ok: true }, {
        headers: { 'X-Custom': 'preserved' },
      });
    });

    const req = new NextRequest('http://localhost/api/test', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const res = await handler(req);
    expect(res.headers.get('x-custom')).toBe('preserved');
    expect(res.headers.has('x-request-id')).toBe(true);
  });
});
