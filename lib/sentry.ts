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

export type SentryDomain =
  | 'checkout'
  | 'webhook'
  | 'email'
  | 'search'
  | 'auth'
  | 'inventory'
  | 'promo';

/**
 * Capture an exception with structured domain context.
 *
 * @param error - The error to capture
 * @param domain - Subsystem that produced the error (used as Sentry tag)
 * @param extra - Arbitrary key-value pairs attached to the event
 * @param level - Sentry severity level (defaults to 'error')
 */
export function captureWithContext(
  error: unknown,
  domain: SentryDomain,
  extra: Record<string, unknown> = {},
  level: Sentry.SeverityLevel = 'error',
): void {
  Sentry.withScope((scope) => {
    scope.setTag('domain', domain);
    scope.setLevel(level);
    scope.setExtras(extra);

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
