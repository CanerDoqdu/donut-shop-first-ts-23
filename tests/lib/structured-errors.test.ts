import { describe, it, expect } from 'vitest';
import {
  formatCheckoutError,
  formatRealtimeError,
  formatQueueError,
  formatDomainError,
  getClassification,
} from '@/lib/structured-errors';
import { ApiError } from '@/lib/api-error';

// ── Helper ──────────────────────────────────────────────────

function makeCodedError(code: string, status = 500): ApiError {
  return new ApiError(code, 'test', status);
}

// ── formatCheckoutError ─────────────────────────────────────

describe('formatCheckoutError', () => {
  it('produces structured payload with domain = checkout', () => {
    const error = makeCodedError('E_STRIPE_CHECKOUT_FAILED');
    const payload = formatCheckoutError(error, {
      orderId: 'ord-1',
      step: 'creating_session',
    });

    expect(payload['error.domain']).toBe('checkout');
    expect(payload['error.code']).toBe('E_STRIPE_CHECKOUT_FAILED');
    expect(payload['error.bucket']).toBe('infrastructure');
    expect(payload['error.retryable']).toBe(true);
    expect(payload['checkout.step']).toBe('creating_session');
    expect(payload.orderId).toBe('ord-1');
  });

  it('includes optional fields only when provided', () => {
    const error = makeCodedError('E_VALIDATION_FAILED', 400);
    const payload = formatCheckoutError(error);

    expect(payload['error.domain']).toBe('checkout');
    expect(payload).not.toHaveProperty('orderId');
    expect(payload).not.toHaveProperty('checkout.step');
  });

  it('includes cartTotal and promoCode', () => {
    const error = makeCodedError('E_PROMO_APPLY_FAILED', 400);
    const payload = formatCheckoutError(error, {
      cartTotal: 42.5,
      promoCode: 'SAVE10',
    });

    expect(payload['checkout.cartTotal']).toBe(42.5);
    expect(payload['checkout.promoCode']).toBe('SAVE10');
  });

  it('includes idempotencyKey', () => {
    const error = makeCodedError('E_CHECKOUT_IDEMPOTENCY_CONFLICT', 409);
    const payload = formatCheckoutError(error, {
      idempotencyKey: 'idem-123',
    });

    expect(payload['checkout.idempotencyKey']).toBe('idem-123');
  });
});

// ── formatRealtimeError ─────────────────────────────────────

describe('formatRealtimeError', () => {
  it('produces structured payload with domain = realtime', () => {
    const error = new Error('WebSocket disconnected');
    const payload = formatRealtimeError(error, {
      channel: 'orders:user-1',
      reconnectAttempt: 3,
      backoffMs: 4000,
    });

    expect(payload['error.domain']).toBe('realtime');
    expect(payload['realtime.channel']).toBe('orders:user-1');
    expect(payload['realtime.reconnectAttempt']).toBe(3);
    expect(payload['realtime.backoffMs']).toBe(4000);
  });

  it('handles errors without code (fallback to Error name)', () => {
    const error = new Error('timeout');
    const payload = formatRealtimeError(error);

    expect(payload['error.code']).toBe('Error');
    expect(payload['error.domain']).toBe('realtime');
  });
});

// ── formatQueueError ────────────────────────────────────────

describe('formatQueueError', () => {
  it('produces structured payload with domain = queue', () => {
    const error = makeCodedError('E_EMAIL_SEND_FAILED');
    const payload = formatQueueError(error, {
      jobId: 'job-42',
      queueName: 'email',
      attemptsMade: 2,
      maxAttempts: 5,
    });

    expect(payload['error.domain']).toBe('queue');
    expect(payload['error.code']).toBe('E_EMAIL_SEND_FAILED');
    expect(payload['queue.jobId']).toBe('job-42');
    expect(payload['queue.name']).toBe('email');
    expect(payload['queue.attemptsMade']).toBe(2);
    expect(payload['queue.maxAttempts']).toBe(5);
  });

  it('includes jobData when provided', () => {
    const error = new Error('processing failed');
    const payload = formatQueueError(error, {
      jobData: { to: 'user@test.com', type: 'welcome' },
    });

    expect(payload['queue.jobData']).toEqual({ to: 'user@test.com', type: 'welcome' });
  });
});

// ── formatDomainError ───────────────────────────────────────

describe('formatDomainError', () => {
  it('formats errors for arbitrary domains', () => {
    const error = makeCodedError('E_WEBHOOK_SIGNATURE_INVALID', 401);
    const payload = formatDomainError(error, 'webhook', {
      eventId: 'evt_1',
    });

    expect(payload['error.domain']).toBe('webhook');
    expect(payload['error.code']).toBe('E_WEBHOOK_SIGNATURE_INVALID');
    expect(payload.eventId).toBe('evt_1');
  });
});

// ── getClassification ───────────────────────────────────────

describe('getClassification', () => {
  it('returns classification object for any error', () => {
    const c = getClassification(new TypeError('x'));
    expect(c.bucket).toBe('programmer');
    expect(c.retryable).toBe(false);
    expect(c.severity).toBe('error');
  });

  it('classifies coded errors correctly', () => {
    const c = getClassification(makeCodedError('E_RATE_LIMITED', 429));
    expect(c.bucket).toBe('operational');
    expect(c.retryable).toBe(true);
  });
});
