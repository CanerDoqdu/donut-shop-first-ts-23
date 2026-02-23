/**
 * Structured error formats for domain-specific error contexts.
 *
 * Each domain (checkout, realtime, queue) has a formatError function
 * that produces a consistent, structured log payload. These payloads
 * include the error classification bucket, retry-able flag, error code,
 * and domain-specific metadata.
 *
 * Usage:
 *   import { formatCheckoutError } from '@/lib/structured-errors';
 *   const payload = formatCheckoutError(error, { orderId, step: 'reserving' });
 *   logger.classifiedError('checkout.failed', error, payload);
 *   captureWithContext(error, 'checkout', payload, { requestId, correlationId });
 */

import {
  classifyError,
  type ErrorClassification,
} from './error-classification';

// ── Common Structured Error Shape ───────────────────────────

export interface StructuredErrorPayload {
  /** Machine-readable error code (e.g., E_STRIPE_CHECKOUT_FAILED) */
  'error.code': string;
  /** 3-bucket classification */
  'error.bucket': string;
  /** Can the request be retried? */
  'error.retryable': boolean;
  /** Sentry severity */
  'error.severity': string;
  /** Domain that produced the error */
  'error.domain': string;
  /** Additional domain-specific fields */
  [key: string]: unknown;
}

// ── Checkout Errors ─────────────────────────────────────────

export interface CheckoutErrorContext {
  orderId?: string;
  userId?: string;
  step?: 'validating' | 'reserving' | 'creating_session' | 'redirecting';
  cartTotal?: number;
  promoCode?: string;
  idempotencyKey?: string;
}

/**
 * Format a checkout error with full context for structured logging + Sentry.
 */
export function formatCheckoutError(
  error: unknown,
  ctx: CheckoutErrorContext = {},
): StructuredErrorPayload {
  const code = extractCode(error);
  const classification = classifyError(error);

  return {
    'error.code': code,
    'error.bucket': classification.bucket,
    'error.retryable': classification.retryable,
    'error.severity': classification.severity,
    'error.domain': 'checkout',
    ...(ctx.orderId ? { orderId: ctx.orderId } : {}),
    ...(ctx.userId ? { userId: ctx.userId } : {}),
    ...(ctx.step ? { 'checkout.step': ctx.step } : {}),
    ...(ctx.cartTotal !== undefined ? { 'checkout.cartTotal': ctx.cartTotal } : {}),
    ...(ctx.promoCode ? { 'checkout.promoCode': ctx.promoCode } : {}),
    ...(ctx.idempotencyKey ? { 'checkout.idempotencyKey': ctx.idempotencyKey } : {}),
  };
}

// ── Realtime Errors ─────────────────────────────────────────

export interface RealtimeErrorContext {
  channel?: string;
  userId?: string;
  reconnectAttempt?: number;
  lastEventId?: string;
  backoffMs?: number;
}

/**
 * Format a realtime (Supabase channel) error with reconnect context.
 */
export function formatRealtimeError(
  error: unknown,
  ctx: RealtimeErrorContext = {},
): StructuredErrorPayload {
  const code = extractCode(error);
  const classification = classifyError(error);

  return {
    'error.code': code,
    'error.bucket': classification.bucket,
    'error.retryable': classification.retryable,
    'error.severity': classification.severity,
    'error.domain': 'realtime',
    ...(ctx.channel ? { 'realtime.channel': ctx.channel } : {}),
    ...(ctx.userId ? { userId: ctx.userId } : {}),
    ...(ctx.reconnectAttempt !== undefined
      ? { 'realtime.reconnectAttempt': ctx.reconnectAttempt }
      : {}),
    ...(ctx.lastEventId ? { 'realtime.lastEventId': ctx.lastEventId } : {}),
    ...(ctx.backoffMs !== undefined ? { 'realtime.backoffMs': ctx.backoffMs } : {}),
  };
}

// ── Queue Errors ────────────────────────────────────────────

export interface QueueErrorContext {
  jobId?: string;
  queueName?: string;
  attemptsMade?: number;
  maxAttempts?: number;
  jobData?: Record<string, unknown>;
}

/**
 * Format a queue (BullMQ) error with job context.
 */
export function formatQueueError(
  error: unknown,
  ctx: QueueErrorContext = {},
): StructuredErrorPayload {
  const code = extractCode(error);
  const classification = classifyError(error);

  return {
    'error.code': code,
    'error.bucket': classification.bucket,
    'error.retryable': classification.retryable,
    'error.severity': classification.severity,
    'error.domain': 'queue',
    ...(ctx.jobId ? { 'queue.jobId': ctx.jobId } : {}),
    ...(ctx.queueName ? { 'queue.name': ctx.queueName } : {}),
    ...(ctx.attemptsMade !== undefined ? { 'queue.attemptsMade': ctx.attemptsMade } : {}),
    ...(ctx.maxAttempts !== undefined ? { 'queue.maxAttempts': ctx.maxAttempts } : {}),
    ...(ctx.jobData ? { 'queue.jobData': ctx.jobData } : {}),
  };
}

// ── Generic Domain Error ────────────────────────────────────

/**
 * Format any error with a domain label. Useful for webhook, email, auth, etc.
 */
export function formatDomainError(
  error: unknown,
  domain: string,
  extra: Record<string, unknown> = {},
): StructuredErrorPayload {
  const code = extractCode(error);
  const classification = classifyError(error);

  return {
    'error.code': code,
    'error.bucket': classification.bucket,
    'error.retryable': classification.retryable,
    'error.severity': classification.severity,
    'error.domain': domain,
    ...extra,
  };
}

// ── Convenience: Classify-only helper ───────────────────────

/**
 * Return just the classification for an error — useful in conditionals.
 */
export function getClassification(error: unknown): ErrorClassification {
  return classifyError(error);
}

// ── Internal ────────────────────────────────────────────────

function extractCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: string }).code);
  }
  if (error instanceof Error) {
    return error.name;
  }
  return 'UNKNOWN';
}
