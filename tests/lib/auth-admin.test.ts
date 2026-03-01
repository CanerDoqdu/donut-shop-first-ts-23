import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Hoist cache mock so it can be manipulated per test
const mockCacheGet = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockCacheSet = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/lib/redis', () => ({
  cache: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
  redisRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60000 }),
}));

// Hoist supabase mocks for full per-test control
const mockMaybeSingle = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
);

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    }),
  }),
}));

import { getAdminInfo, isAdmin, requireAdmin } from '@/lib/auth/admin';

const adminRow = { role: 'admin', permissions: { manage_orders: true } };
const adminInfo = { userId: 'user-1', role: 'admin', permissions: { manage_orders: true } };

describe('getAdminInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns null immediately when cache contains not-admin sentinel', async () => {
    mockCacheGet.mockResolvedValue('not-admin');

    const result = await getAdminInfo('user-1');

    expect(result).toBeNull();
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it('returns cached AdminInfo when cache has a valid entry', async () => {
    mockCacheGet.mockResolvedValue(adminInfo);

    const result = await getAdminInfo('user-1');

    expect(result).toEqual(adminInfo);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it('returns null and does not cache on DB error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    const result = await getAdminInfo('user-1');

    expect(result).toBeNull();
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it('caches not-admin sentinel and returns null when user is not in admin_users', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getAdminInfo('user-1');

    expect(result).toBeNull();
    expect(mockCacheSet).toHaveBeenCalledWith('admin:user-1', 'not-admin', 300);
  });

  it('caches AdminInfo and returns it when user is found in admin_users', async () => {
    mockMaybeSingle.mockResolvedValue({ data: adminRow, error: null });

    const result = await getAdminInfo('user-1');

    expect(result).toEqual(adminInfo);
    expect(mockCacheSet).toHaveBeenCalledWith('admin:user-1', adminInfo, 300);
  });
});

describe('isAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns false when no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await isAdmin();

    expect(result).toBe(false);
  });

  it('returns false when authenticated user is not an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // not in admin_users

    const result = await isAdmin();

    expect(result).toBe(false);
  });

  it('returns true when authenticated user is an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: adminRow, error: null });

    const result = await isAdmin();

    expect(result).toBe(true);
  });
});

describe('requireAdmin', () => {
  const fakeReq = new Request('http://localhost/api/admin/test', {
    headers: { 'x-request-id': 'req-admin-test' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 NextResponse when no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await requireAdmin(fakeReq);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect((result as Response).headers.get('x-request-id')).toBe('req-admin-test');
  });

  it('returns 403 NextResponse when authenticated user is not an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@test.com' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // not admin

    const result = await requireAdmin(fakeReq);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect((result as Response).headers.get('x-request-id')).toBe('req-admin-test');
  });

  it('returns AdminInfo when user is a valid admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'admin@test.com' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: adminRow, error: null });

    const result = await requireAdmin(fakeReq);

    expect(result).toEqual(adminInfo);
    expect((result as Response).status).toBeUndefined();
  });
});
