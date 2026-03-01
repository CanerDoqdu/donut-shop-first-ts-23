import { NextResponse } from 'next/server';

// ── Standard API Error ──────────────────────────────────────

/**
 * Structured error thrown inside route handlers.
 * Caught by `withHandler` and serialised into a standard JSON body.
 */
export class ApiError extends Error {
  /** Optional headers to attach to the error response (e.g. Retry-After). */
  public readonly headers?: Record<string, string>;

  constructor(
    /** Machine-readable code (e.g. VALIDATION_ERROR, NOT_FOUND) */
    public readonly code: string,
    /** Human-readable message safe to show to the client */
    message: string,
    /** HTTP status code */
    public readonly status: number = 500,
    /** Optional extra metadata. */
    options?: { headers?: Record<string, string> },
  ) {
    super(message);
    this.name = 'ApiError';
    this.headers = options?.headers;
  }
}

// ── Standard Response Shape ─────────────────────────────────

/** JSON body returned on every error response. */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  /** Optional structured details for clients; avoid PII. */
  details?: Record<string, unknown>;
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
  options?: { headers?: Record<string, string>; details?: Record<string, unknown> },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = options?.details === undefined
    ? { code, message, requestId }
    : { code, message, requestId, details: options.details };

  return NextResponse.json(body, {
    status,
    headers: {
      'x-request-id': requestId,
      ...(options?.headers ?? {}),
    },
  });
}
