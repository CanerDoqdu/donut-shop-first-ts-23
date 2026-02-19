import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import checkoutCompleted from '@/tests/fixtures/stripe-checkout-completed.json';
import checkoutExpired from '@/tests/fixtures/stripe-checkout-expired.json';
import paymentFailed from '@/tests/fixtures/stripe-payment-failed.json';

/**
 * Webhook replay tests using Stripe fixture payloads.
 *
 * Strategy:
 *  - Mock getStripe().webhooks.constructEvent to bypass signature verification
 *    and return the fixture payload directly.
 *  - Mock Supabase admin client for DB calls.
 *  - Mock env/config for required secrets.
 *  - Test response shapes, idempotency, maintenance mode, and error paths.
 */

// ── Mocks ─────────────────────────────────────────────────────

const mockRpc = vi.fn().mockResolvedValue({ data: { success: true, order_id: 'oid', points_awarded: 10 }, error: null });
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
});
const mockInsert = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'stripe_events') return { insert: mockInsert };
    if (table === 'orders') return { update: mockUpdate };
    return {};
  }),
  rpc: mockRpc,
};

// Mock Supabase createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

// Mock env
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fake-service-role',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
}));

// Mock config with feature flags
let webhooksEnabled = true;
vi.mock('@/lib/config', () => ({
  featureFlags: {
    get webhooksEnabled() { return webhooksEnabled; },
    checkoutEnabled: true,
  },
}));

// Mock getStripe — constructEvent returns the fixture directly
let constructEventResult: unknown = null;
let constructEventThrow: Error | null = null;

vi.mock('@/lib/stripe/server', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: () => {
        if (constructEventThrow) throw constructEventThrow;
        return constructEventResult;
      },
    },
  }),
}));

// Mock withTimeout to just execute the promise
vi.mock('@/lib/fetch-with-timeout', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}));

// Suppress logger output in tests
vi.mock('@/lib/logger', () => {
  const noop = () => {};
  const noopLogger = {
    info: noop, warn: noop, error: noop, debug: noop,
    metric: noop, count: noop,
    withContext: () => noopLogger,
  };
  return { logger: noopLogger, startTimer: () => () => 0 };
});

// ── Helpers ───────────────────────────────────────────────────

async function callWebhook(body: string, headers: Record<string, string> = {}) {
  // Reset module cache so fresh mock state is picked up
  const mod = await import('@/app/api/webhooks/stripe/route');
  const req = new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: {
      'stripe-signature': 'sig_test',
      'x-request-id': 'rid-webhook-test',
      ...headers,
    },
  });
  const res = await mod.POST(req);
  const json = await res.json();
  return { status: res.status, body: json, headers: res.headers };
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  webhooksEnabled = true;
  constructEventResult = null;
  constructEventThrow = null;
  // Default: first insert succeeds (new event)
  mockInsert.mockResolvedValue({ error: null });
});

describe('POST /api/webhooks/stripe — replay tests', () => {
  // ── Response contract ──────────────────────────────────────

  it('returns { received: true } + x-request-id for valid event', async () => {
    constructEventResult = checkoutCompleted;
    const { status, body, headers } = await callWebhook(JSON.stringify(checkoutCompleted));

    expect(status).toBe(200);
    expect(body.received).toBe(true);
    expect(headers.get('x-request-id')).toBe('rid-webhook-test');
  });

  // ── Maintenance mode ───────────────────────────────────────

  it('returns 503 MAINTENANCE when webhooks disabled', async () => {
    webhooksEnabled = false;
    const { status, body } = await callWebhook('{}');

    expect(status).toBe(503);
    expect(body.code).toBe('MAINTENANCE');
    expect(body).toHaveProperty('requestId');
  });

  // ── Missing signature ──────────────────────────────────────

  it('returns 400 when stripe-signature header is missing', async () => {
    const mod = await import('@/app/api/webhooks/stripe/route');
    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
      headers: { 'x-request-id': 'rid-nosig' },
      // No stripe-signature header
    });
    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('E_WEBHOOK_SIGNATURE_MISSING');
    expect(body).toHaveProperty('requestId');
  });

  // ── Invalid signature ──────────────────────────────────────

  it('returns 400 when signature verification fails', async () => {
    constructEventThrow = new Error('Invalid signature');
    const { status, body } = await callWebhook('{}');

    expect(status).toBe(400);
    expect(body.code).toBe('E_WEBHOOK_SIGNATURE_INVALID');
  });

  // ── Idempotency: duplicate event ───────────────────────────

  it('returns 200 { received: true } for duplicate event (idempotent)', async () => {
    constructEventResult = checkoutCompleted;
    // Simulate unique_violation (PG code 23505)
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });

    const { status, body } = await callWebhook(JSON.stringify(checkoutCompleted));

    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });

  // ── Event: checkout.session.completed ──────────────────────

  it('processes checkout.session.completed via RPC', async () => {
    constructEventResult = checkoutCompleted;
    const { status } = await callWebhook(JSON.stringify(checkoutCompleted));

    expect(status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('process_payment_completed', {
      p_stripe_session_id: 'cs_test_a1b2c3d4e5',
      p_payment_intent_id: 'pi_test_intent_001',
    });
  });

  // ── Event: checkout.session.expired ────────────────────────

  it('processes checkout.session.expired', async () => {
    constructEventResult = checkoutExpired;
    const { status } = await callWebhook(JSON.stringify(checkoutExpired));

    expect(status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('orders');
  });

  // ── Event: payment_intent.payment_failed ───────────────────

  it('processes payment_intent.payment_failed (log only)', async () => {
    constructEventResult = paymentFailed;
    const { status, body } = await callWebhook(JSON.stringify(paymentFailed));

    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });

  // ── Handler error → 500 ────────────────────────────────────

  it('returns 500 E_WEBHOOK_HANDLER_ERROR when handler throws', async () => {
    constructEventResult = checkoutCompleted;
    mockRpc.mockRejectedValue(new Error('DB crash'));

    const { status, body } = await callWebhook(JSON.stringify(checkoutCompleted));

    expect(status).toBe(500);
    expect(body.code).toBe('E_WEBHOOK_HANDLER_ERROR');
    expect(body.message).toBe('Internal error');
  });

  // ── Unhandled event type → 200 ─────────────────────────────

  it('returns 200 for unknown event types (unhandled)', async () => {
    constructEventResult = {
      id: 'evt_unknown_001',
      type: 'customer.subscription.created',
      data: { object: {} },
    };
    const { status, body } = await callWebhook('{}');

    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });
});
