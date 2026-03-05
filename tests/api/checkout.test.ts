import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { API_VERSION } from '@/lib/constants';

const mockValidateOrigin = vi.hoisted(() => vi.fn());
const mockRedisRateLimit = vi.hoisted(() => vi.fn());
const mockParseBody = vi.hoisted(() => vi.fn());
const mockGetProductsByIds = vi.hoisted(() => vi.fn());
const mockCreateCheckoutSession = vi.hoisted(() => vi.fn());
const mockStripeSessionRetrieve = vi.hoisted(() => vi.fn());
const mockReserveStock = vi.hoisted(() => vi.fn());
const mockReleaseReservations = vi.hoisted(() => vi.fn());
const mockApplyPromo = vi.hoisted(() => vi.fn());
const mockRollbackPromo = vi.hoisted(() => vi.fn());
const mockWithTimeout = vi.hoisted(() => vi.fn());
const mockFeatureFlags = vi.hoisted(() => ({
  checkoutEnabled: true,
  webhooksEnabled: true,
  normalizePromoCodes: true,
  strictWebhookIdempotency: false,
}));
const mockGetUser = vi.hoisted(() => vi.fn());

const mockOrdersMaybeSingle = vi.hoisted(() => vi.fn());
const mockOrdersInsertSingle = vi.hoisted(() => vi.fn());
const mockOrdersUpdateEq = vi.hoisted(() => vi.fn());
const mockOrderItemsInsert = vi.hoisted(() => vi.fn());
const mockOrderItemsProbeLimit = vi.hoisted(() => vi.fn());
const mockProfilesUpsert = vi.hoisted(() => vi.fn());

vi.mock('@/lib/security', () => ({
  validateOrigin: mockValidateOrigin,
}));

vi.mock('@/lib/config', () => ({
  featureFlags: mockFeatureFlags,
}));

vi.mock('@/lib/redis', () => ({
  redisRateLimit: mockRedisRateLimit,
}));

vi.mock('@/lib/validations', () => ({
  checkoutSchema: {},
  parseBody: mockParseBody,
}));

vi.mock('@/lib/data.server', () => ({
  getProductsByIds: mockGetProductsByIds,
}));

vi.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: mockStripeSessionRetrieve,
      },
    },
  }),
}));

vi.mock('@/lib/fetch-with-timeout', () => ({
  withTimeout: mockWithTimeout,
}));

vi.mock('@/lib/inventory', () => ({
  reserveStock: mockReserveStock,
  releaseReservations: mockReleaseReservations,
}));

vi.mock('@/lib/promo', () => ({
  applyPromo: mockApplyPromo,
  rollbackPromo: mockRollbackPromo,
}));

vi.mock('@/lib/migration', () => ({
  dualWriteStripeSession: (sessionId: string) => ({ stripe_session_id: sessionId }),
}));

vi.mock('@/lib/sentry', () => ({
  captureWithContext: vi.fn(),
  addCorrelatedBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/logger', () => {
  const noop = () => {};
  const noopLogger = {
    info: noop,
    warn: noop,
    error: noop,
    metric: noop,
    count: noop,
    classifiedError: noop,
    withContext: () => noopLogger,
  };
  return {
    logger: noopLogger,
    startTimer: () => () => 0,
    extractCorrelationId: () => 'corr-test',
  };
});

vi.mock('@/lib/rate-limit', () => ({
  getClientIP: () => '127.0.0.1',
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabasePublicEnv: () => ({ url: 'https://example.supabase.co' }),
  getSupabaseServiceRoleKey: () => 'service-role-key',
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockOrdersMaybeSingle,
            }),
          }),
          insert: () => ({
            select: () => ({
              single: mockOrdersInsertSingle,
            }),
          }),
          update: () => ({
            eq: mockOrdersUpdateEq,
          }),
        };
      }

      if (table === 'order_items') {
        return {
          select: () => ({
            limit: mockOrderItemsProbeLimit,
          }),
          insert: mockOrderItemsInsert,
        };
      }

      if (table === 'profiles') {
        return {
          upsert: mockProfilesUpsert,
        };
      }

      return {
        select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }),
      };
    },
  }),
}));

async function callCheckout(body: unknown, headers: Record<string, string> = {}) {
  const mod = await import('@/app/api/checkout/route');
  const req = new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      ...headers,
    },
  });
  const res = await mod.POST(req);
  const json = await res.json();
  return { status: res.status, body: json, headers: res.headers };
}

describe('POST /api/checkout — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockValidateOrigin.mockReturnValue(null);
    mockFeatureFlags.checkoutEnabled = true;
    mockFeatureFlags.normalizePromoCodes = true;
    mockRedisRateLimit.mockResolvedValue({ success: true });
    mockGetUser.mockResolvedValue({ data: { user: null } });

    mockParseBody.mockReturnValue({
      success: true,
      data: {
        items: [{ id: 'donut-1', quantity: 2 }],
        customerEmail: 'test@donut.dev',
        customerName: 'Test User',
        customerPhone: '',
        customerAddress: '',
        locale: 'en',
        cartTimestamp: Date.now(),
      },
    });

    mockOrdersMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockGetProductsByIds.mockResolvedValue({
      map: new Map([
        ['donut-1', { id: 'donut-1', name_en: 'Classic Donut', price: 10, image_url: 'img.png' }],
      ]),
      dbIds: new Set(['donut-1']),
    });

    mockProfilesUpsert.mockResolvedValue({ error: null });
    mockOrdersInsertSingle.mockResolvedValue({ data: { id: 'order-1' }, error: null });
    mockOrderItemsProbeLimit.mockResolvedValue({ data: [] });
    mockOrderItemsInsert.mockResolvedValue({ error: null });
    mockReserveStock.mockResolvedValue({ success: true });
    mockCreateCheckoutSession.mockResolvedValue({ id: 'cs_test_1', url: 'https://stripe.test/checkout/cs_test_1' });
    mockStripeSessionRetrieve.mockResolvedValue({
      id: 'cs_existing_1',
      url: 'https://stripe.test/checkout/cs_existing_1',
      status: 'open',
    });
    mockWithTimeout.mockImplementation((promise: Promise<unknown>) => promise);
    mockOrdersUpdateEq.mockResolvedValue({ error: null });
    mockApplyPromo.mockResolvedValue({ success: true, discountValue: 0, promoId: null });
    mockRollbackPromo.mockResolvedValue(undefined);
    mockReleaseReservations.mockResolvedValue(undefined);
  });

  it('returns 503 MAINTENANCE when checkout is disabled', async () => {
    mockFeatureFlags.checkoutEnabled = false;

    const { status, body, headers } = await callCheckout({});

    expect(status).toBe(503);
    expect(body.code).toBe('MAINTENANCE');
    expect(headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('returns 429 when rate limiter rejects the request', async () => {
    mockRedisRateLimit.mockResolvedValueOnce({ success: false });

    const { status, body, headers } = await callCheckout({});

    expect(status).toBe(429);
    expect(body.message).toContain('Too many requests');
    expect(headers.get('retry-after')).toBe('60');
    expect(headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('returns 400 when payload validation fails', async () => {
    mockParseBody.mockReturnValueOnce({
      success: false,
      error: 'Invalid checkout payload',
    });

    const { status, body, headers } = await callCheckout({ invalid: true });

    expect(status).toBe(400);
    expect(body.code).toBe('E_VALIDATION_FAILED');
    expect(headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('creates checkout session and returns { url, orderId } on happy path', async () => {
    const { status, body, headers } = await callCheckout({
      items: [{ id: 'donut-1', quantity: 2 }],
      customerEmail: 'test@donut.dev',
      customerName: 'Test User',
      locale: 'en',
    });

    expect(status).toBe(200);
    expect(body.url).toBe('https://stripe.test/checkout/cs_test_1');
    expect(body.orderId).toBe('order-1');
    expect(headers.get('x-api-version')).toBe(API_VERSION);
    expect(mockCreateCheckoutSession).toHaveBeenCalled();
  });

  it('normalizes promo code before apply when feature flag is enabled', async () => {
    mockParseBody.mockReturnValueOnce({
      success: true,
      data: {
        items: [{ id: 'donut-1', quantity: 2 }],
        customerEmail: 'test@donut.dev',
        customerName: 'Test User',
        customerPhone: '',
        customerAddress: '',
        locale: 'en',
        cartTimestamp: Date.now(),
        promoCode: ' firstdonut ',
      },
    });

    const { status } = await callCheckout({});

    expect(status).toBe(200);
    expect(mockApplyPromo).toHaveBeenCalledWith(expect.anything(), 'FIRSTDONUT', expect.any(Number));
  });

  it('keeps promo code as-is when normalization flag is disabled', async () => {
    mockFeatureFlags.normalizePromoCodes = false;
    mockParseBody.mockReturnValueOnce({
      success: true,
      data: {
        items: [{ id: 'donut-1', quantity: 2 }],
        customerEmail: 'test@donut.dev',
        customerName: 'Test User',
        customerPhone: '',
        customerAddress: '',
        locale: 'en',
        cartTimestamp: Date.now(),
        promoCode: ' firstdonut ',
      },
    });

    const { status } = await callCheckout({});

    expect(status).toBe(200);
    expect(mockApplyPromo).toHaveBeenCalledWith(expect.anything(), ' firstdonut ', expect.any(Number));
  });

  it('returns existing checkout URL when idempotency key hits an open Stripe session', async () => {
    mockParseBody.mockReturnValueOnce({
      success: true,
      data: {
        items: [{ id: 'donut-1', quantity: 1 }],
        customerEmail: 'test@donut.dev',
        customerName: 'Replay User',
        customerPhone: '',
        customerAddress: '',
        locale: 'en',
        cartTimestamp: Date.now(),
        idempotencyKey: 'idem-123',
      },
    });

    mockOrdersMaybeSingle.mockResolvedValueOnce({
      data: { id: 'order-existing-1', stripe_session_id: 'cs_existing_1' },
      error: null,
    });

    const { status, body, headers } = await callCheckout({});

    expect(status).toBe(200);
    expect(body).toEqual({
      url: 'https://stripe.test/checkout/cs_existing_1',
      orderId: 'order-existing-1',
    });
    expect(headers.get('x-idempotent-replay')).toBe('true');
    expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('cs_existing_1');
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when promo application fails', async () => {
    mockParseBody.mockReturnValueOnce({
      success: true,
      data: {
        items: [{ id: 'donut-1', quantity: 1 }],
        customerEmail: 'test@donut.dev',
        customerName: 'Promo User',
        customerPhone: '',
        customerAddress: '',
        locale: 'en',
        cartTimestamp: Date.now(),
        promoCode: 'BROKENPROMO',
      },
    });
    mockApplyPromo.mockResolvedValueOnce({ success: false, message: 'Promo invalid' });

    const { status, body } = await callCheckout({});

    expect(status).toBe(400);
    expect(body.code).toBe('E_PROMO_APPLY_FAILED');
  });

  it('rolls back promo and reservations when Stripe checkout session creation fails', async () => {
    mockParseBody.mockReturnValueOnce({
      success: true,
      data: {
        items: [{ id: 'donut-1', quantity: 1 }],
        customerEmail: 'test@donut.dev',
        customerName: 'Stripe Error User',
        customerPhone: '',
        customerAddress: '',
        locale: 'en',
        cartTimestamp: Date.now(),
        promoCode: 'FIRSTDONUT',
      },
    });
    mockApplyPromo.mockResolvedValueOnce({ success: true, discountValue: 2, promoId: 'promo-1' });
    mockCreateCheckoutSession.mockRejectedValueOnce(new Error('Stripe timeout'));

    const { status, body } = await callCheckout({});

    expect(status).toBe(500);
    expect(body.code).toBe('E_STRIPE_CHECKOUT_FAILED');
    expect(mockReleaseReservations).toHaveBeenCalledWith('order-1');
    expect(mockRollbackPromo).toHaveBeenCalledWith(expect.anything(), 'promo-1');
  });
});
