/**
 * Environment-specific configuration.
 * Centralises env-var access with validation so the app fails fast
 * if a required variable is missing.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // ─── Supabase ──────────────────────────────────────────────
  supabase: {
    url: required('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },

  // ─── Stripe ────────────────────────────────────────────────
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  },

  // ─── Resend (email) ────────────────────────────────────────
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
  },

  // ─── App ───────────────────────────────────────────────────
  app: {
    url: optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    nodeEnv: optional('NODE_ENV', 'development'),
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
} as const;
