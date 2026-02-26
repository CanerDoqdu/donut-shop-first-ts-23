import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/lib/env';

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

const originalEnv: Partial<Record<EnvKey, string | undefined>> = {};

describe('env app/site URL fallbacks', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('prefers explicit NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_SITE_URL values', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.example.com';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'prod.vercel.app';
    process.env.VERCEL_URL = 'preview.vercel.app';

    expect(env.NEXT_PUBLIC_APP_URL).toBe('https://app.example.com');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://site.example.com');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL when public URLs are missing', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'donut-shop-one.vercel.app';

    expect(env.NEXT_PUBLIC_APP_URL).toBe('https://donut-shop-one.vercel.app');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://donut-shop-one.vercel.app');
  });

  it('falls back to VERCEL_URL when project production URL is missing', () => {
    process.env.VERCEL_URL = 'donut-shop-preview.vercel.app';

    expect(env.NEXT_PUBLIC_APP_URL).toBe('https://donut-shop-preview.vercel.app');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://donut-shop-preview.vercel.app');
  });

  it('falls back to localhost when no URL environment is configured', () => {
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });
});
