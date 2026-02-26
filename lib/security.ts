import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// ─── CSRF / Origin validation ─────────────────────────────────

/**
 * Allowed origins derived from the configured app/site URLs.
 * Includes localhost for development.
 */
function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Configured app/site URLs
  for (const raw of [env.NEXT_PUBLIC_APP_URL, env.NEXT_PUBLIC_SITE_URL]) {
    try {
      const { origin } = new URL(raw);
      origins.add(origin);
    } catch {
      // Skip malformed URLs
    }
  }

  // Vercel auto-injected URLs (available server-side at runtime)
  for (const vercelVar of [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ]) {
    if (vercelVar) {
      origins.add(`https://${vercelVar}`);
    }
  }

  // Always allow localhost in development
  if (env.isDevelopment) {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * Verify that the request originates from a trusted origin.
 *
 * Checks the `Origin` header first (set by fetch/XHR on mutations),
 * then falls back to `Referer`. Rejects requests with no origin signal
 * unless they come from a server-to-server context (no Origin + no Referer
 * is acceptable for webhooks — guard those separately).
 *
 * @returns `null` when the origin is valid, or a 403 `NextResponse`.
 */
export function validateOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Webhooks legitimately arrive without Origin/Referer — skip there.
  // Callers that need to exempt specific routes can check before calling.

  const allowed = getAllowedOrigins();

  // Fast-path: Origin header present and allowed
  if (origin) {
    if (allowed.has(origin)) return null;

    logger.warn('Origin check failed', { origin, allowed: [...allowed] });
    return NextResponse.json(
      { error: 'Forbidden: origin not allowed' },
      { status: 403 },
    );
  }

  // Fallback: check Referer header (preflight-less simple requests)
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return null;
    } catch {
      // malformed referer — reject
    }

    logger.warn('Referer check failed', { referer });
    return NextResponse.json(
      { error: 'Forbidden: origin not allowed' },
      { status: 403 },
    );
  }

  // Neither Origin nor Referer present
  // In production, reject; in development, allow for testing tools
  if (env.isProduction) {
    logger.warn('Missing Origin and Referer headers on mutation request', {
      path: req.nextUrl.pathname,
    });
    return NextResponse.json(
      { error: 'Forbidden: missing origin' },
      { status: 403 },
    );
  }

  return null;
}

// ─── Input sanitization ───────────────────────────────────────

/**
 * Strip HTML tags and trim whitespace from a string.
 * Prevents XSS when user-supplied text is later rendered or stored.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/&[#\w]+;/g, '')  // strip HTML entities
    .trim();
}

/**
 * Sanitize all string values in a shallow object.
 * Useful for cleaning an entire `req.json()` payload in one call.
 */
export function sanitizePayload<T extends Record<string, unknown>>(payload: T): T {
  const clean = { ...payload };
  for (const key of Object.keys(clean)) {
    const val = clean[key];
    if (typeof val === 'string') {
      (clean as Record<string, unknown>)[key] = sanitizeString(val);
    }
  }
  return clean;
}

/**
 * Validate that an email looks structurally valid.
 * Not a full RFC 5322 check — just enough to reject obvious junk.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Clamp a numeric value within a safe range.
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
