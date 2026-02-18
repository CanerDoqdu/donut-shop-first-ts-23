/**
 * Environment-specific configuration.
 *
 * Uses lazy getters so that missing env vars only throw when
 * actually accessed at runtime — never during build / CI.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  // ─── Supabase ──────────────────────────────────────────────
  supabase: {
    get url() {
      return required('NEXT_PUBLIC_SUPABASE_URL');
    },
    get anonKey() {
      return required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    },
  },

  // ─── Stripe ────────────────────────────────────────────────
  stripe: {
    get secretKey() {
      return process.env.STRIPE_SECRET_KEY ?? '';
    },
    get webhookSecret() {
      return process.env.STRIPE_WEBHOOK_SECRET ?? '';
    },
    get publicKey() {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    },
  },

  // ─── Resend (email) ────────────────────────────────────────
  resend: {
    get apiKey() {
      return process.env.RESEND_API_KEY ?? '';
    },
  },

  // ─── App ───────────────────────────────────────────────────
  app: {
    get url() {
      return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    },
    get nodeEnv() {
      return process.env.NODE_ENV ?? 'development';
    },
    get isProduction() {
      return process.env.NODE_ENV === 'production';
    },
    get isDevelopment() {
      return process.env.NODE_ENV === 'development';
    },
  },
};
