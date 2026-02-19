import { NextRequest, NextResponse } from 'next/server';
import { ApiError, getRequestId, apiErrorResponse } from './api-error';
import { logger } from './logger';

// ── Types ───────────────────────────────────────────────────

export interface HandlerContext {
  /** Unique request identifier (from header or auto-generated). */
  requestId: string;
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
 *  2. **Structured error handling** — `ApiError` → standard JSON body.
 *  3. **Unhandled error catch** — logs + returns generic 500.
 *  4. **x-request-id** header attached to every response.
 *
 * Usage:
 *   export const POST = withHandler(async (req, { requestId }) => { ... });
 */
export function withHandler(handler: RouteHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId(req);
    const log = logger.withContext({ requestId, path: req.nextUrl.pathname });

    try {
      const res = await handler(req, { requestId });
      res.headers.set('x-request-id', requestId);
      return res;
    } catch (err) {
      if (err instanceof ApiError) {
        log.warn('api.known_error', {
          code: err.code,
          status: err.status,
          message: err.message,
        });
        return apiErrorResponse(err.code, err.message, err.status, requestId);
      }

      log.error('api.unhandled_error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return apiErrorResponse(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        500,
        requestId,
      );
    }
  };
}
