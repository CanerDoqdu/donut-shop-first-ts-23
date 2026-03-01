import { NextRequest, NextResponse } from 'next/server';
import { ApiError, getRequestId, apiErrorResponse } from './api-error';
import { logger, extractCorrelationId, startTimer } from './logger';
import { classifyError } from './error-classification';
import { captureWithContext, addCorrelatedBreadcrumb } from './sentry';
import { metrics } from './metrics';
import { validateOrigin } from './security';
import { E_INTERNAL } from './error-codes';

// ── Types ───────────────────────────────────────────────────

export interface HandlerContext {
  /** Unique request identifier (from header or auto-generated). */
  requestId: string;
  /** Correlation ID tracing a user journey across requests. */
  correlationId: string;
}

type RouteHandler = (
  req: NextRequest,
  ctx: HandlerContext,
) => Promise<NextResponse>;

// ── Wrapper ─────────────────────────────────────────────────

/**
 * Higher-order function that wraps a Next.js route handler with:
 *
 *  1. **CSRF validation** — mutation methods (POST/PUT/PATCH/DELETE) are
 *     automatically checked unless `skipCsrf` is set.
 *  2. **requestId** — extracted from `x-request-id` header or generated.
 *  3. **correlationId** — extracted from `x-correlation-id` header or generated.
 *  4. **Structured error handling** — `ApiError` → standard JSON body.
 *  5. **Error classification** — operational / programmer / infrastructure.
 *  6. **Sentry capture** — with domain, requestId, correlationId, classification.
 *  7. **x-request-id + x-correlation-id** headers attached to every response.
 *
 * Usage:
 *   export const POST = withHandler(async (req, { requestId, correlationId }) => { ... });
 *   export const GET = withHandler(handler, 'checkout', { skipCsrf: true });
 */

interface HandlerOptions {
  /** Skip automatic CSRF origin validation (e.g. for webhooks). */
  skipCsrf?: boolean;
}

export function withHandler(handler: RouteHandler, domain?: string, options?: HandlerOptions) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId(req);
    const correlationId = extractCorrelationId(req);
    const elapsed = startTimer();
    const log = logger.withContext({
      requestId,
      correlationId,
      path: req.nextUrl.pathname,
      method: req.method,
    });

    // Breadcrumb: request started
    addCorrelatedBreadcrumb('http', `${req.method} ${req.nextUrl.pathname}`, {
      requestId,
      correlationId,
    });

    try {
      // Auto-CSRF: validate origin on mutation methods unless opted out
      const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
      if (!options?.skipCsrf && mutationMethods.has(req.method)) {
        const csrfError = validateOrigin(req);
        if (csrfError) {
          log.warn('api.csrf_rejected', { method: req.method });
          return csrfError;
        }
      }

      const res = await handler(req, { requestId, correlationId });
      res.headers.set('x-request-id', requestId);
      res.headers.set('x-correlation-id', correlationId);

      const durationMs = elapsed();

      // Record API metrics
      const endpoint = req.nextUrl.pathname;
      metrics.recordLatency(endpoint, durationMs);

      // Track checkout outcomes
      if (endpoint === '/api/checkout') {
        if (res.status >= 200 && res.status < 300) {
          metrics.recordCheckoutOutcome('success');
        }
      }

      // Structured log: request completed
      log.info('api.request_completed', {
        status: res.status,
        durationMs,
      });

      return res;
    } catch (err) {
      const durationMs = elapsed();
      const classification = classifyError(err);
      const endpoint = req.nextUrl.pathname;

      // Record error metric
      metrics.recordLatency(endpoint, durationMs);
      metrics.recordError(endpoint, err instanceof ApiError ? err.code : undefined);

      // Track checkout failure outcomes
      if (endpoint === '/api/checkout') {
        if (err instanceof ApiError && err.code === 'E_VALIDATION_FAILED') {
          metrics.recordCheckoutOutcome('validation_fail');
        } else if (err instanceof ApiError && err.status === 408) {
          metrics.recordCheckoutOutcome('timeout');
        } else {
          metrics.recordCheckoutOutcome('error');
        }
      }

      if (err instanceof ApiError) {
        log.classifiedError('api.known_error', err, {
          code: err.code,
          status: err.status,
        });

        // Sentry: only capture infrastructure + programmer errors
        if (classification.bucket !== 'operational') {
          captureWithContext(err, (domain ?? 'auth') as import('./sentry').SentryDomain, {
            code: err.code,
            status: err.status,
          }, {
            requestId,
            correlationId,
            classification,
          });
        }

        const res = apiErrorResponse(err.code, err.message, err.status, requestId, {
          headers: err.headers,
        });
        res.headers.set('x-correlation-id', correlationId);
        return res;
      }

      // Unhandled errors are always programmer or infrastructure
      log.classifiedError('api.unhandled_error', err, {
        durationMs: elapsed(),
      });

      captureWithContext(
        err,
        (domain ?? 'auth') as import('./sentry').SentryDomain,
        { path: req.nextUrl.pathname },
        { requestId, correlationId, classification },
      );

      const res = apiErrorResponse(
        E_INTERNAL,
        'An unexpected error occurred',
        500,
        requestId,
      );
      res.headers.set('x-correlation-id', correlationId);
      return res;
    }
  };
}
