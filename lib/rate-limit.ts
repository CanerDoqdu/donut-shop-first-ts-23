/**
 * Simple in-memory rate limiter using token bucket algorithm.
 * Suitable for single-instance deployments. For multi-instance,
 * replace with Redis-based implementation.
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.lastRefill > 600_000) {
      store.delete(key);
    }
  }
}, 300_000);

interface RateLimitOptions {
  /** Max requests per window */
  maxRequests?: number;
  /** Window size in seconds */
  windowSizeSeconds?: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { maxRequests = 10, windowSizeSeconds = 60 } = options;
  const now = Date.now();
  const windowMs = windowSizeSeconds * 1000;

  let entry = store.get(identifier);

  if (!entry) {
    entry = { tokens: maxRequests - 1, lastRefill: now };
    store.set(identifier, entry);
    return { success: true, remaining: entry.tokens, reset: now + windowMs };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refill = Math.floor((elapsed / windowMs) * maxRequests);

  if (refill > 0) {
    entry.tokens = Math.min(maxRequests, entry.tokens + refill);
    entry.lastRefill = now;
  }

  if (entry.tokens <= 0) {
    return {
      success: false,
      remaining: 0,
      reset: entry.lastRefill + windowMs,
    };
  }

  entry.tokens -= 1;
  return {
    success: true,
    remaining: entry.tokens,
    reset: entry.lastRefill + windowMs,
  };
}

/**
 * Get client IP from request headers (works behind proxies)
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}
