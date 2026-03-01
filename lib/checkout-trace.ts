/**
 * Checkout Trace — Request Lifecycle Correlation.
 *
 * Provides end-to-end tracing for checkout flows using correlation IDs.
 * Each checkout request gets a unique trace that follows the request
 * through: validation → inventory check → Stripe session → order creation → webhook.
 *
 * Design decision: Lightweight trace context using structured logging.
 * No external tracing system (Jaeger/Zipkin) — log correlation is sufficient.
 *
 * Alternative considered: OpenTelemetry SDK.
 * Rejected: heavy dependency, overkill for single-service Next.js app.
 * Structured logs with correlation IDs provide the same debugging value.
 *
 * Usage:
 *   import { CheckoutTracer } from '@/lib/checkout-trace';
 *
 *   const tracer = new CheckoutTracer(requestId);
 *   tracer.startSpan('validate_cart');
 *   // ... do work ...
 *   tracer.endSpan('validate_cart');
 *   tracer.startSpan('create_stripe_session');
 *   // ... do work ...
 *   tracer.endSpan('create_stripe_session');
 *   tracer.finish('success');
 */

import { logger, type Logger } from './logger';

// ── Types ───────────────────────────────────────────────────

export type CheckoutPhase =
  | 'validate_cart'
  | 'check_inventory'
  | 'apply_promo'
  | 'calculate_total'
  | 'create_stripe_session'
  | 'create_order'
  | 'reserve_stock'
  | 'send_confirmation'
  | 'webhook_received'
  | 'webhook_processed';

export type CheckoutOutcome = 'success' | 'validation_error' | 'payment_error' | 'system_error' | 'timeout';

export interface SpanRecord {
  phase: CheckoutPhase;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface TraceRecord {
  traceId: string;
  requestId: string;
  userId?: string;
  startedAt: string;
  finishedAt?: string;
  totalDurationMs?: number;
  outcome?: CheckoutOutcome;
  spans: SpanRecord[];
  metadata?: Record<string, unknown>;
}

// ── Core Tracer ─────────────────────────────────────────────

export class CheckoutTracer {
  private spans: SpanRecord[] = [];
  private activeSpans = new Map<string, SpanRecord>();
  private startTime: number;
  private log: Logger;

  readonly traceId: string;
  readonly requestId: string;
  userId?: string;

  constructor(requestId: string, userId?: string) {
    this.traceId = crypto.randomUUID();
    this.requestId = requestId;
    this.userId = userId;
    this.startTime = Date.now();
    this.log = logger.withContext({
      traceId: this.traceId,
      requestId: this.requestId,
      component: 'checkout_trace',
    });

    this.log.info('checkout_trace.started', { userId });
  }

  /** Start a new span for a checkout phase. */
  startSpan(phase: CheckoutPhase, metadata?: Record<string, unknown>): void {
    const span: SpanRecord = {
      phase,
      startMs: Date.now() - this.startTime,
      metadata,
    };

    this.activeSpans.set(phase, span);
    this.log.info(`checkout_trace.span.start`, { phase, ...metadata });
  }

  /** End a span for a checkout phase. */
  endSpan(phase: CheckoutPhase, metadata?: Record<string, unknown>): void {
    const span = this.activeSpans.get(phase);
    if (!span) {
      this.log.warn('checkout_trace.span.not_found', { phase });
      return;
    }

    span.endMs = Date.now() - this.startTime;
    span.durationMs = span.endMs - span.startMs;
    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }

    this.spans.push(span);
    this.activeSpans.delete(phase);

    this.log.info(`checkout_trace.span.end`, {
      phase,
      durationMs: span.durationMs,
      ...metadata,
    });
  }

  /** Record an error in a span. */
  errorSpan(phase: CheckoutPhase, error: string): void {
    const span = this.activeSpans.get(phase);
    if (span) {
      span.error = error;
      span.endMs = Date.now() - this.startTime;
      span.durationMs = span.endMs - span.startMs;
      this.spans.push(span);
      this.activeSpans.delete(phase);
    }

    this.log.error('checkout_trace.span.error', { phase, error });
  }

  /** Finish the trace with an outcome. */
  finish(outcome: CheckoutOutcome, metadata?: Record<string, unknown>): TraceRecord {
    // Close any still-active spans
    for (const [phase, span] of this.activeSpans) {
      span.endMs = Date.now() - this.startTime;
      span.durationMs = span.endMs - span.startMs;
      span.error = 'span_not_closed';
      this.spans.push(span);
      this.log.warn('checkout_trace.span.auto_closed', { phase });
    }
    this.activeSpans.clear();

    const totalDurationMs = Date.now() - this.startTime;

    const record: TraceRecord = {
      traceId: this.traceId,
      requestId: this.requestId,
      userId: this.userId,
      startedAt: new Date(this.startTime).toISOString(),
      finishedAt: new Date().toISOString(),
      totalDurationMs,
      outcome,
      spans: this.spans,
      metadata,
    };

    this.log.info('checkout_trace.finished', {
      outcome,
      totalDurationMs,
      spanCount: this.spans.length,
      ...metadata,
    });

    // Emit metric for monitoring
    logger.metric('checkout_trace_duration_ms', totalDurationMs, {
      outcome,
      traceId: this.traceId,
    });

    return record;
  }

  /** Get current trace state (for debugging). */
  getTraceRecord(): TraceRecord {
    return {
      traceId: this.traceId,
      requestId: this.requestId,
      userId: this.userId,
      startedAt: new Date(this.startTime).toISOString(),
      spans: [...this.spans],
    };
  }
}

/**
 * Create a correlation context for linking checkout request to webhook.
 * Store the traceId as metadata in the Stripe session so the webhook
 * handler can retrieve it.
 */
export function createCorrelationMetadata(tracer: CheckoutTracer): Record<string, string> {
  return {
    trace_id: tracer.traceId,
    request_id: tracer.requestId,
    ...(tracer.userId ? { user_id: tracer.userId } : {}),
  };
}
