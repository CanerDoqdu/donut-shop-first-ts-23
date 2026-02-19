/**
 * Timeout & retry utilities for external service calls.
 *
 * ── Retry Policy ──────────────────────────────────────────────
 *
 *  | Operation                | Retry? | Reason                                |
 *  |--------------------------|--------|---------------------------------------|
 *  | GET (read)               | Yes    | Idempotent by nature                  |
 *  | Stripe checkout.create   | No     | Use Stripe idempotencyKey instead     |
 *  | Stripe webhook verify    | No     | Stripe retries delivery automatically |
 *  | Supabase INSERT/UPDATE   | No     | Not naturally idempotent              |
 *  | Supabase SELECT          | Yes    | Read-only                             |
 *  | Resend email send        | No     | May cause duplicate emails            |
 *
 * When in doubt, do NOT retry mutations. Let the caller/client retry.
 */

const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds

// ── Promise timeout ─────────────────────────────────────────

/**
 * Race a promise against a timer. Rejects with `Error` if the
 * deadline is exceeded — does NOT cancel the underlying work
 * (use AbortController for that).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  label = 'operation',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// ── fetch with AbortController ──────────────────────────────

/**
 * `fetch()` wrapper that aborts the request after `timeoutMs`.
 * The underlying TCP connection is cancelled (not just ignored).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...fetchInit, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Simple exponential backoff (read-only operations) ───────

interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms. Actual delay doubles each attempt. Default: 500 */
  baseDelayMs?: number;
  /** Per-attempt timeout. Default: 10 000 */
  timeoutMs?: number;
}

/**
 * Retry an async function with exponential backoff.
 *
 * **Only use for idempotent (read) operations.**
 * Never use for mutations — see retry policy table above.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, `attempt ${attempt}`);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
