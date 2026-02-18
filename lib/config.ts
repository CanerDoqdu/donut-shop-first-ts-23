/**
 * Application configuration & feature flags.
 *
 * For raw env vars, import `env` from '@/lib/env' directly.
 * This file adds grouped config objects and feature toggles
 * on top of the validated env layer.
 */

import { env } from '@/lib/env';

// ── Re-export env for convenience ────────────────────────────
export { env };

// ── Feature flags ────────────────────────────────────────────
// Flip these to enable/disable features across the app.
// In the future, these can be driven by a remote config service.

export const featureFlags = {
  /** Enable the loyalty points program */
  loyaltyProgram: true,

  /** Enable gift card purchasing and redemption */
  giftCards: true,

  /** Enable donut subscription plans */
  subscriptions: true,

  /** Enable the referral system */
  referrals: true,

  /** Enable store locator map */
  storeLocator: true,

  /** Enable Web Vitals reporting to /api/vitals */
  webVitals: env.isProduction,

  /** Enable bundle analyzer (set ANALYZE=true in env) */
  bundleAnalyzer: process.env.ANALYZE === 'true',
} as const;

// ── Grouped config (derived from env) ────────────────────────

export const config = {
  supabase: {
    get url() { return env.NEXT_PUBLIC_SUPABASE_URL; },
    get anonKey() { return env.NEXT_PUBLIC_SUPABASE_ANON_KEY; },
  },
  stripe: {
    get secretKey() { return env.STRIPE_SECRET_KEY; },
    get webhookSecret() { return env.STRIPE_WEBHOOK_SECRET; },
    get publicKey() { return env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; },
  },
  resend: {
    get apiKey() { return env.RESEND_API_KEY; },
  },
  app: {
    get url() { return env.NEXT_PUBLIC_APP_URL; },
    get siteUrl() { return env.NEXT_PUBLIC_SITE_URL; },
    get version() { return env.NEXT_PUBLIC_APP_VERSION; },
    get nodeEnv() { return env.NODE_ENV; },
    get isProduction() { return env.isProduction; },
    get isDevelopment() { return env.isDevelopment; },
  },
} as const;
