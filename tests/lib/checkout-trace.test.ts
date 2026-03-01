/**
 * Checkout Trace Tests.
 *
 * Tests:
 * - Trace creation with IDs
 * - Span lifecycle (start, end, error)
 * - Outcome recording
 * - Duration computation
 * - Correlation metadata
 * - Auto-close of unclosed spans
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutTracer, createCorrelationMetadata } from '@/lib/checkout-trace';

vi.mock('@/lib/logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    metric: vi.fn(),
    withContext: vi.fn(() => mockLogger),
  };
  return { logger: mockLogger };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CheckoutTracer', () => {
  it('creates a trace with unique IDs', () => {
    const tracer = new CheckoutTracer('req-1', 'user-1');

    expect(tracer.traceId).toBeTruthy();
    expect(tracer.requestId).toBe('req-1');
    expect(tracer.userId).toBe('user-1');
  });

  it('records spans with duration', () => {
    const tracer = new CheckoutTracer('req-1');

    tracer.startSpan('validate_cart');
    tracer.endSpan('validate_cart');

    const record = tracer.getTraceRecord();
    expect(record.spans).toHaveLength(1);
    expect(record.spans[0].phase).toBe('validate_cart');
    expect(record.spans[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('records span metadata', () => {
    const tracer = new CheckoutTracer('req-1');

    tracer.startSpan('apply_promo', { promoCode: 'SAVE10' });
    tracer.endSpan('apply_promo', { discount: 10 });

    const record = tracer.getTraceRecord();
    expect(record.spans[0].metadata).toEqual({
      promoCode: 'SAVE10',
      discount: 10,
    });
  });

  it('records span errors', () => {
    const tracer = new CheckoutTracer('req-1');

    tracer.startSpan('create_stripe_session');
    tracer.errorSpan('create_stripe_session', 'Stripe API timeout');

    const record = tracer.getTraceRecord();
    expect(record.spans[0].error).toBe('Stripe API timeout');
    expect(record.spans[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('finishes trace with outcome', () => {
    const tracer = new CheckoutTracer('req-1', 'user-1');

    tracer.startSpan('validate_cart');
    tracer.endSpan('validate_cart');

    const record = tracer.finish('success', { orderId: 'order-123' });

    expect(record.outcome).toBe('success');
    expect(record.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(record.finishedAt).toBeTruthy();
    expect(record.metadata).toEqual({ orderId: 'order-123' });
  });

  it('auto-closes unclosed spans on finish', () => {
    const tracer = new CheckoutTracer('req-1');

    tracer.startSpan('validate_cart');
    // Never end it

    const record = tracer.finish('system_error');

    expect(record.spans).toHaveLength(1);
    expect(record.spans[0].error).toBe('span_not_closed');
  });

  it('handles ending non-existent span gracefully', () => {
    const tracer = new CheckoutTracer('req-1');
    // Should not throw
    tracer.endSpan('validate_cart');
    expect(tracer.getTraceRecord().spans).toHaveLength(0);
  });

  it('tracks multiple spans in sequence', () => {
    const tracer = new CheckoutTracer('req-1');

    tracer.startSpan('validate_cart');
    tracer.endSpan('validate_cart');
    tracer.startSpan('check_inventory');
    tracer.endSpan('check_inventory');
    tracer.startSpan('create_stripe_session');
    tracer.endSpan('create_stripe_session');

    const record = tracer.finish('success');
    expect(record.spans).toHaveLength(3);
    expect(record.spans.map((s) => s.phase)).toEqual([
      'validate_cart',
      'check_inventory',
      'create_stripe_session',
    ]);
  });
});

describe('createCorrelationMetadata', () => {
  it('creates metadata with trace and request IDs', () => {
    const tracer = new CheckoutTracer('req-1', 'user-1');
    const meta = createCorrelationMetadata(tracer);

    expect(meta.trace_id).toBe(tracer.traceId);
    expect(meta.request_id).toBe('req-1');
    expect(meta.user_id).toBe('user-1');
  });

  it('omits user_id when not provided', () => {
    const tracer = new CheckoutTracer('req-1');
    const meta = createCorrelationMetadata(tracer);

    expect(meta.trace_id).toBeTruthy();
    expect(meta.user_id).toBeUndefined();
  });
});
