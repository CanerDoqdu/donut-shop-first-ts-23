import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockValidateOrigin = vi.hoisted(() => vi.fn());
const mockRedisRateLimit = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockProfileMaybeSingle = vi.hoisted(() => vi.fn());
const mockLoyaltyMaybeSingle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/security', () => ({
  validateOrigin: mockValidateOrigin,
}));

vi.mock('@/lib/redis', () => ({
  redisRateLimit: mockRedisRateLimit,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabasePublicEnv: () => ({
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  }),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: table === 'profiles' ? mockProfileMaybeSingle : mockLoyaltyMaybeSingle,
        }),
      }),
    }),
  }),
}));

async function callAuthMe(headers: Record<string, string> = {}) {
  const { GET } = await import('@/app/api/auth/me/route');
  const req = new NextRequest('http://localhost/api/auth/me', {
    method: 'GET',
    headers,
  });
  const res = await GET(req);
  const body = await res.json();
  return { res, body };
}

describe('GET /api/auth/me — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(null);
    mockRedisRateLimit.mockResolvedValue({ success: true });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockProfileMaybeSingle.mockResolvedValue({ data: null });
    mockLoyaltyMaybeSingle.mockResolvedValue({ data: null });
  });

  it('returns 403 when origin validation fails', async () => {
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );

    const { res, body } = await callAuthMe();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 429 when rate limit is exhausted', async () => {
    mockRedisRateLimit.mockResolvedValueOnce({ success: false });

    const { res, body } = await callAuthMe();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Too many requests');
    expect(res.headers.get('retry-after')).toBe('60');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns null user payload when not authenticated', async () => {
    const { res, body } = await callAuthMe();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      user: null,
      profile: null,
      loyalty: null,
    });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns safe user + profile + loyalty when authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: 'demo@donut.dev',
          user_metadata: {
            full_name: 'Demo User',
            name: 'Demo',
            avatar_url: 'https://avatar.test/u.png',
            ignored_field: 'secret',
          },
          app_metadata: {
            provider: 'github',
          },
        },
      },
    });

    mockProfileMaybeSingle.mockResolvedValueOnce({
      data: { id: 'user-1', email: 'demo@donut.dev', full_name: 'Demo User' },
    });

    mockLoyaltyMaybeSingle.mockResolvedValueOnce({
      data: { total_points: 150, tier: 'silver', lifetime_points: 420 },
    });

    const { res, body } = await callAuthMe();

    expect(res.status).toBe(200);
    expect(body.user).toEqual({
      id: 'user-1',
      email: 'demo@donut.dev',
      user_metadata: {
        full_name: 'Demo User',
        name: 'Demo',
        avatar_url: 'https://avatar.test/u.png',
      },
    });
    expect(body.user).not.toHaveProperty('app_metadata');
    expect(body.profile).toEqual({ id: 'user-1', email: 'demo@donut.dev', full_name: 'Demo User' });
    expect(body.loyalty).toEqual({ total_points: 150, tier: 'silver', lifetime_points: 420 });
  });
});
