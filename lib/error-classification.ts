/**
 * Error Classification System — 3 buckets.
 *
 * Every error in the app falls into one of:
 *
 *  1. **Operational** — Expected failure the *user* can recover from
 *     (rate limit, bad input, stale data, auth fail).
 *  2. **Programmer** — Bug that an *engineer* needs to fix
 *     (null ref, type mismatch, assertion failure).
 *  3. **Infrastructure** — External service failure that *ops* escalates
 *     (DB down, Redis timeout, Stripe outage, OOM).
 *
 * Usage:
 *   import { classifyError, type ErrorClassification } from '@/lib/error-classification';
 *   const c = classifyError(error); // { bucket, retryable, severity }
 *   logger.error('checkout failed', { ...c });
 */

// ── Types ───────────────────────────────────────────────────

export type ErrorBucket = 'operational' | 'programmer' | 'infrastructure';

export interface ErrorClassification {
  /** Which team handles this: user (operational), engineer (programmer), ops (infrastructure) */
  bucket: ErrorBucket;
  /** Whether the same request can succeed if retried immediately */
  retryable: boolean;
  /** Sentry severity level for alerting */
  severity: 'info' | 'warning' | 'error' | 'fatal';
}

// ── Status-code → Bucket lookup ─────────────────────────────

const STATUS_OPERATIONAL = new Set([400, 401, 403, 404, 409, 410, 422, 429]);
const STATUS_INFRASTRUCTURE = new Set([502, 503, 504]);

// ── Error-code prefix → Bucket lookup ───────────────────────

const CODE_PREFIX_MAP: Record<string, ErrorBucket> = {
  E_AUTH: 'operational',
  E_VALIDATION: 'operational',
  E_RATE: 'operational',
  E_CART: 'operational',
  E_PRODUCT: 'operational',
  E_PROMO: 'operational',
  E_OUT_OF_STOCK: 'operational',
  E_STOCK: 'infrastructure',
  E_CHECKOUT_IDEMPOTENCY: 'operational',
  E_DB: 'infrastructure',
  E_WEBHOOK_RPC: 'infrastructure',
  E_STRIPE: 'infrastructure',
  E_EMAIL: 'infrastructure',
};

// ── Retryable error codes ───────────────────────────────────

const RETRYABLE_CODES = new Set([
  'E_RATE_LIMITED',
  'E_AUTH_RATE_LIMITED',
  'E_DB_QUERY_FAILED',
  'E_WEBHOOK_RPC_UNAVAILABLE',
  'E_STRIPE_CHECKOUT_FAILED',
  'E_STRIPE_SESSION_CREATE_FAILED',
  'E_STRIPE_GIFT_CARD_FAILED',
  'E_EMAIL_SEND_FAILED',
  'E_STOCK_RESERVE_FAILED',
]);

// ── Core Classification Function ────────────────────────────

/**
 * Classify an error into one of the 3 buckets.
 *
 * Resolution order:
 *  1. JavaScript built-in error types (TypeError, ReferenceError → programmer)
 *  2. Known error code prefix → mapped bucket
 *  3. HTTP status code → mapped bucket
 *  4. Fallback: programmer (because unknown = a bug we didn't anticipate)
 */
export function classifyError(
  error: unknown,
  opts?: { code?: string; status?: number },
): ErrorClassification {
  const code = opts?.code ?? extractCode(error);
  const status = opts?.status ?? extractStatus(error);

  // ── 1. JS built-in error types are always programmer errors ──
  if (isProgrammerError(error)) {
    return { bucket: 'programmer', retryable: false, severity: 'error' };
  }

  // ── 2. Classify by error code prefix ─────────────────────────
  if (code) {
    const bucket = classifyByCode(code);
    if (bucket) {
      return {
        bucket,
        retryable: RETRYABLE_CODES.has(code),
        severity: severityForBucket(bucket),
      };
    }
  }

  // ── 3. Classify by HTTP status code ──────────────────────────
  if (status) {
    if (STATUS_OPERATIONAL.has(status)) {
      return {
        bucket: 'operational',
        retryable: status === 429 || status === 409,
        severity: 'warning',
      };
    }
    if (STATUS_INFRASTRUCTURE.has(status)) {
      return { bucket: 'infrastructure', retryable: true, severity: 'error' };
    }
  }

  // ── 4. Fallback: unknown error = programmer bug ──────────────
  return { bucket: 'programmer', retryable: false, severity: 'error' };
}

// ── Classification by error code (convenience) ──────────────

/**
 * Classify by error code alone — useful when you have the code but not the Error instance.
 */
export function classifyByErrorCode(code: string): ErrorClassification {
  return classifyError(undefined, { code });
}

// ── Internal Helpers ────────────────────────────────────────

function isProgrammerError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof RangeError ||
    error instanceof SyntaxError
  );
}

function extractCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code;
  }
  return undefined;
}

function extractStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function classifyByCode(code: string): ErrorBucket | undefined {
  // Try longest prefix first (e.g., E_OUT_OF_STOCK before E_OUT)
  const prefixes = Object.keys(CODE_PREFIX_MAP).sort(
    (a, b) => b.length - a.length,
  );
  for (const prefix of prefixes) {
    if (code.startsWith(prefix)) {
      return CODE_PREFIX_MAP[prefix];
    }
  }
  return undefined;
}

function severityForBucket(bucket: ErrorBucket): ErrorClassification['severity'] {
  switch (bucket) {
    case 'operational':
      return 'warning';
    case 'programmer':
      return 'error';
    case 'infrastructure':
      return 'error';
  }
}
