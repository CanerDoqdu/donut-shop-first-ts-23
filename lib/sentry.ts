/**
 * Sentry helper utilities for structured error capturing.
 *
 * Wraps Sentry.withScope to attach domain-specific context
 * (checkout, webhook, email) so errors in Sentry dashboard
 * are grouped and filterable by subsystem.
 *
 * Usage:
 *   import { captureWithContext } from '@/lib/sentry';
 *   captureWithContext(error, 'checkout', { orderId, userId });
 */

import * as Sentry from '@sentry/nextjs';
import {
  classifyError,
  type ErrorClassification,
} from './error-classification';

export type SentryDomain =
  | 'checkout'
  | 'webhook'
  | 'email'
  | 'search'
  | 'auth'
  | 'inventory'
  | 'promo'
  | 'realtime'
  | 'queue';

/** Extended options for richer Sentry context. */
export interface CaptureOptions {
  /** Sentry severity level (defaults to auto-classified level). */
  level?: Sentry.SeverityLevel;
  /** Request ID for tracing (x-request-id). */
  requestId?: string;
  /** Correlation ID for end-to-end user journey tracing. */
  correlationId?: string;
  /** Override auto-classification. */
  classification?: ErrorClassification;
}

/**
 * Capture an exception with structured domain context.
 *
 * @param error - The error to capture
 * @param domain - Subsystem that produced the error (used as Sentry tag)
 * @param extra - Arbitrary key-value pairs attached to the event
 * @param levelOrOpts - Sentry severity level or extended options
 */
export function captureWithContext(
  error: unknown,
  domain: SentryDomain,
  extra: Record<string, unknown> = {},
  levelOrOpts?: Sentry.SeverityLevel | CaptureOptions,
): void {
  // Normalise options
  const opts: CaptureOptions =
    typeof levelOrOpts === 'string' ? { level: levelOrOpts } : (levelOrOpts ?? {});

  // Auto-classify the error
  const classification = opts.classification ?? classifyError(error);
  const level = opts.level ?? mapSeverity(classification.severity);

  Sentry.withScope((scope) => {
    // Core tags (filterable in Sentry UI)
    scope.setTag('domain', domain);
    scope.setTag('error.bucket', classification.bucket);
    scope.setTag('error.retryable', String(classification.retryable));
    scope.setLevel(level);

    // Tracing tags
    if (opts.requestId) scope.setTag('requestId', opts.requestId);
    if (opts.correlationId) scope.setTag('correlationId', opts.correlationId);

    // Extra context (searchable in Sentry event detail)
    scope.setExtras({
      ...extra,
      'error.bucket': classification.bucket,
      'error.retryable': classification.retryable,
      'error.severity': classification.severity,
      ...(opts.requestId ? { requestId: opts.requestId } : {}),
      ...(opts.correlationId ? { correlationId: opts.correlationId } : {}),
    });

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), level);
    }
  });
}

/**
 * Set user context for Sentry events.
 * Call this when user is authenticated.
 */
export function setSentryUser(user: { id: string; email?: string }): void {
  Sentry.setUser({ id: user.id, email: user.email });
}

/**
 * Clear user context (e.g. on logout).
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for debugging context.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * Add a breadcrumb with correlation context for end-to-end tracing.
 * Each breadcrumb includes requestId + correlationId so you can
 * reconstruct a user's checkout journey in Sentry.
 */
export function addCorrelatedBreadcrumb(
  category: string,
  message: string,
  opts: {
    requestId?: string;
    correlationId?: string;
    data?: Record<string, unknown>;
  } = {},
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data: {
      ...opts.data,
      ...(opts.requestId ? { requestId: opts.requestId } : {}),
      ...(opts.correlationId ? { correlationId: opts.correlationId } : {}),
    },
    level: 'info',
  });
}

// ── Internal helpers ────────────────────────────────────────

function mapSeverity(
  severity: ErrorClassification['severity'],
): Sentry.SeverityLevel {
  switch (severity) {
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'fatal':
      return 'fatal';
  }
}
