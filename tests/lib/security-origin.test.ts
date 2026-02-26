import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn(() => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() })),
  },
}));

import { validateOrigin } from '@/lib/security';

const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

const originalEnv: Partial<Record<EnvKey, string | undefined>> = {};

describe('validateOrigin with Vercel runtime origins', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }

    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_APP_URL = 'https://donut-shop-one.vercel.app';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://donut-shop-one.vercel.app';
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

  it('allows request Origin from VERCEL_BRANCH_URL', () => {
    process.env.VERCEL_BRANCH_URL = 'donut-shop-git-fix.vercel.app';

    const req = new NextRequest('https://donut-shop-one.vercel.app/api/checkout', {
      method: 'POST',
      headers: {
        origin: 'https://donut-shop-git-fix.vercel.app',
      },
    });

    expect(validateOrigin(req)).toBeNull();
  });

  it('allows request Referer from VERCEL_URL when Origin is absent', () => {
    process.env.VERCEL_URL = 'donut-shop-preview.vercel.app';

    const req = new NextRequest('https://donut-shop-one.vercel.app/api/checkout', {
      method: 'POST',
      headers: {
        referer: 'https://donut-shop-preview.vercel.app/en/cart',
      },
    });

    expect(validateOrigin(req)).toBeNull();
  });
});
