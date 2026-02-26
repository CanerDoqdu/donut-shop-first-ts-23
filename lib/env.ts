/**
 * Centralized environment variable validation.
 *
 * Import `env` from this module instead of reading `process.env` directly.
 * Variables are validated once on first access (lazy), so the build never
 * crashes — but the app fails fast at runtime with a clear error if a
 * required variable is missing.
 *
 * IMPORTANT: Next.js only inlines `NEXT_PUBLIC_*` vars into client bundles
 * when they are accessed as *literal* strings (e.g. `process.env.NEXT_PUBLIC_FOO`).
 * Dynamic access like `process.env[name]` will be `undefined` on the client.
 * Therefore, every NEXT_PUBLIC_* getter below uses a literal access.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const url = env.NEXT_PUBLIC_SUPABASE_URL;
 */

// ── Helpers (server-only vars — safe for dynamic access) ─────

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Add it to .env.local or your hosting provider's env config.`
    );
  }
  return value;
}

function requireLiteral(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Add it to .env.local or your hosting provider's env config.`
    );
  }
  return value;
}

// ── Schema ───────────────────────────────────────────────────
// Every process.env.* in the codebase is listed here.
// If you add a new env var anywhere, add it here too.
//
// NEXT_PUBLIC_* vars use literal process.env.NEXT_PUBLIC_X access
// so Next.js can statically inline them into client bundles.

export const env = {
  // ─── Supabase (required) ─────────────────────────────────
  get NEXT_PUBLIC_SUPABASE_URL() {
    return requireLiteral(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return requireLiteral(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },

  // ─── Stripe ──────────────────────────────────────────────
  get STRIPE_SECRET_KEY() {
    return required('STRIPE_SECRET_KEY');
  },
  get STRIPE_WEBHOOK_SECRET() {
    return required('STRIPE_WEBHOOK_SECRET');
  },
  get NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  },

  // ─── Resend (email) ─────────────────────────────────────
  get RESEND_API_KEY() {
    return required('RESEND_API_KEY');
  },

  // ─── App URLs ────────────────────────────────────────────
  get NEXT_PUBLIC_APP_URL() {
    return (
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null) ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      'http://localhost:3000'
    );
  },
  get NEXT_PUBLIC_SITE_URL() {
    return (
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null) ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      'http://localhost:3000'
    );
  },

  // ─── App metadata ────────────────────────────────────────
  get NEXT_PUBLIC_APP_VERSION() {
    return process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0-dev';
  },

  // ─── Runtime ─────────────────────────────────────────────
  get NODE_ENV() {
    return process.env.NODE_ENV ?? 'development';
  },
  get isProduction() {
    return this.NODE_ENV === 'production';
  },
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
} as const;
