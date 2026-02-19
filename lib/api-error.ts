import { NextResponse } from 'next/server';

// ── Standard API Error ──────────────────────────────────────

/**
 * Structured error thrown inside route handlers.
 * Caught by `withHandler` and serialised into a standard JSON body.
 */
export class ApiError extends Error {
  constructor(
    /** Machine-readable code (e.g. VALIDATION_ERROR, NOT_FOUND) */
    public readonly code: string,
    /** Human-readable message safe to show to the client */
    message: string,
    /** HTTP status code */
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Standard Response Shape ─────────────────────────────────

/** JSON body returned on every error response. */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
}

// ── Helpers ─────────────────────────────────────────────────

/** Extract x-request-id from headers or generate a new UUID. */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? crypto.randomUUID();
}

/** Build a standard error NextResponse with x-request-id header. */
export function apiErrorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { code, message, requestId },
    { status, headers: { 'x-request-id': requestId } },
  );
}
