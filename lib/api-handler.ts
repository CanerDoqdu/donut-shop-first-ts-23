import { NextRequest, NextResponse } from 'next/server';
import { ApiError, getRequestId, apiErrorResponse } from './api-error';
import { logger, extractCorrelationId, startTimer } from './logger';
import { classifyError } from './error-classification';
import { captureWithContext, addCorrelatedBreadcrumb } from './sentry';

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
 *  1. **requestId** — extracted from `x-request-id` header or generated.
 *  2. **correlationId** — extracted from `x-correlation-id` header or generated.
 *  3. **Structured error handling** — `ApiError` → standard JSON body.
 *  4. **Error classification** — operational / programmer / infrastructure.
 *  5. **Sentry capture** — with domain, requestId, correlationId, classification.
 *  6. **x-request-id + x-correlation-id** headers attached to every response.
 *
 * Usage:
 *   export const POST = withHandler(async (req, { requestId, correlationId }) => { ... });
 */
export function withHandler(handler: RouteHandler, domain?: string) {
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
      const res = await handler(req, { requestId, correlationId });
      res.headers.set('x-request-id', requestId);
      res.headers.set('x-correlation-id', correlationId);

      // Structured log: request completed
      log.info('api.request_completed', {
        status: res.status,
        durationMs: elapsed(),
      });

      return res;
    } catch (err) {
      const classification = classifyError(err);

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

        const res = apiErrorResponse(err.code, err.message, err.status, requestId);
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
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        500,
        requestId,
      );
      res.headers.set('x-correlation-id', correlationId);
      return res;
    }
  };
}
