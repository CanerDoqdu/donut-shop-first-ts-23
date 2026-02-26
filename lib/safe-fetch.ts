/**
 * safeFetch — resilient client-side fetch wrapper.
 *
 * Features:
 *  - AbortController-based timeout (default 15s)
 *  - External abort signal forwarding (for hook-level cancellation)
 *  - Automatic retry for idempotent (GET) requests
 *  - Structured error shaping (no raw Response leaks to UI)
 *  - JSON parsing with fallback
 *
 * Non-goals:
 *  - Caching (handled by SWR / React Query or Next.js fetch cache)
 *  - Auth token injection (middleware handles that)
 */

// ─── Types ──────────────────────────────────────────────────────

export interface SafeFetchOptions extends Omit<RequestInit, 'signal'> {
  /** Timeout in ms (default: 15 000) */
  timeout?: number;
  /** External abort signal (e.g. from useLatestRequest) */
  signal?: AbortSignal;
  /** Max retries for idempotent (GET/HEAD) requests (default: 2) */
  retries?: number;
  /** Request source tag for observability */
  source?: string;
}

export interface SafeFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

// ─── Constants ──────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 500; // base delay, doubles per retry

// ─── Helpers ────────────────────────────────────────────────────

function isIdempotent(method?: string): boolean {
  const m = (method ?? 'GET').toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Merge two AbortSignals so the combined one fires when *either* does. */
function mergeSignals(a: AbortSignal, b?: AbortSignal): AbortSignal {
  if (!b) return a;
  const controller = new AbortController();

  const abort = () => controller.abort();
  a.addEventListener('abort', abort, { once: true });
  b.addEventListener('abort', abort, { once: true });

  // Already aborted?
  if (a.aborted || b.aborted) controller.abort();

  return controller.signal;
}

// ─── Main function ──────────────────────────────────────────────

export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult<T>> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    retries = isIdempotent(options.method) ? DEFAULT_RETRIES : 0,
    source,
    ...fetchInit
  } = options;

  // Build headers
  const headers = new Headers(fetchInit.headers);
  if (source) headers.set('x-request-source', source);
  if (!headers.has('Content-Type') && fetchInit.body) {
    headers.set('Content-Type', 'application/json');
  }

  let lastError: string = 'Unknown error';
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Per-attempt timeout controller
    const timeoutController = new AbortController();
    const combinedSignal = mergeSignals(timeoutController.signal, externalSignal);
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchInit,
        headers,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // Parse JSON (graceful fallback)
      let data: T | null = null;
      try {
        data = (await response.json()) as T;
      } catch {
        // Non-JSON response — data stays null
      }

      if (response.ok) {
        return { ok: true, status: response.status, data, error: null };
      }

      // Non-OK response
      lastStatus = response.status;
      // API returns { message } or { error } depending on the handler — try both
      lastError =
        (data && typeof data === 'object'
          ? String(
              (data as Record<string, unknown>).message ??
              (data as Record<string, unknown>).error ??
              ''
            ) || null
          : null) ?? response.statusText;

      // Don't retry client errors (4xx) — they won't change
      if (response.status >= 400 && response.status < 500) {
        return { ok: false, status: response.status, data, error: lastError };
      }

      // 5xx — retry if idempotent and retries remain
      if (attempt < retries) {
        await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      return { ok: false, status: response.status, data, error: lastError };
    } catch (err) {
      clearTimeout(timeoutId);

      // External abort — surface immediately, don't retry
      if (externalSignal?.aborted) {
        return { ok: false, status: 0, data: null, error: 'Request aborted' };
      }

      // Timeout
      if (timeoutController.signal.aborted) {
        lastError = 'Request timed out';
        lastStatus = 0;
        if (attempt < retries) {
          await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        return { ok: false, status: 0, data: null, error: lastError };
      }

      // Network error
      lastError = err instanceof Error ? err.message : 'Network error';
      lastStatus = 0;
      if (attempt < retries) {
        await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  // Exhausted all retries
  return { ok: false, status: lastStatus, data: null, error: lastError };
}
