import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { API_VERSION } from '@/lib/constants';

const mockValidateOrigin = vi.hoisted(() => vi.fn());
const mockGetModerationQueue = vi.hoisted(() => vi.fn());
const mockModerateReview = vi.hoisted(() => vi.fn());
const mockAuthGetUser = vi.hoisted(() => vi.fn());
const mockAdminMembershipMaybeSingle = vi.hoisted(() => vi.fn());

const mockAdminClient = {
  from: vi.fn((table: string) => {
    if (table === 'admin_users') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mockAdminMembershipMaybeSingle,
          }),
        }),
      };
    }

    return {};
  }),
};

vi.mock('@/lib/security', () => ({
  validateOrigin: mockValidateOrigin,
}));

vi.mock('@/lib/reviews', () => ({
  getModerationQueue: mockGetModerationQueue,
  moderateReview: mockModerateReview,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockAuthGetUser,
    },
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockAdminClient,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fake-service-role',
  },
}));

vi.mock('@/lib/logger', () => {
  const noop = () => {};
  return {
    logger: {
      info: noop,
      warn: noop,
      error: noop,
    },
  };
});

async function callGet() {
  const { GET } = await import('@/app/api/admin/reviews/route');
  const req = new Request('http://localhost/api/admin/reviews', { method: 'GET' });
  const res = await GET(req);
  const body = await res.json();
  return { res, body };
}

async function callPatch(payload: unknown) {
  const { PATCH } = await import('@/app/api/admin/reviews/route');
  const req = new NextRequest('http://localhost/api/admin/reviews', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    },
  });
  const res = await PATCH(req);
  const body = await res.json();
  return { res, body };
}

describe('GET/PATCH /api/admin/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(null);
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockAdminMembershipMaybeSingle.mockResolvedValue({ data: { user_id: 'admin-1' } });
    mockGetModerationQueue.mockResolvedValue([{ id: 'review-1', status: 'pending' }]);
    mockModerateReview.mockResolvedValue({ success: true, error: null });
  });

  it('returns 401 when session is missing', async () => {
    mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } });

    const { res, body } = await callGet();

    expect(res.status).toBe(401);
    expect(body.code).toBe('E_AUTH_SESSION_MISSING');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('returns moderation queue for authorized admin', async () => {
    const { res, body } = await callGet();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.reviews[0].id).toBe('review-1');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('returns 403 for PATCH when origin validation fails', async () => {
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden: origin not allowed' }, { status: 403 }),
    );

    const { res, body } = await callPatch({ reviewId: 'review-1', status: 'approved' });

    expect(res.status).toBe(403);
    expect(body.error).toContain('Forbidden');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('returns 401 when PATCH user is not an admin', async () => {
    mockAdminMembershipMaybeSingle.mockResolvedValueOnce({ data: null });

    const { res, body } = await callPatch({ reviewId: 'review-1', status: 'approved' });

    expect(res.status).toBe(401);
    expect(body.code).toBe('E_AUTH_SESSION_MISSING');
  });

  it('returns 400 when required fields are missing', async () => {
    const { res, body } = await callPatch({ status: 'approved' });

    expect(res.status).toBe(400);
    expect(body.code).toBe('E_VALIDATION_FAILED');
  });

  it('returns 400 when status is invalid', async () => {
    const { res, body } = await callPatch({ reviewId: 'review-1', status: 'pending' });

    expect(res.status).toBe(400);
    expect(body.code).toBe('E_VALIDATION_FAILED');
  });

  it('returns 422 when moderation transition fails', async () => {
    mockModerateReview.mockResolvedValueOnce({
      success: false,
      error: 'Invalid transition: approved → rejected',
    });

    const { res, body } = await callPatch({ reviewId: 'review-1', status: 'rejected' });

    expect(res.status).toBe(422);
    expect(body.code).toBe('E_VALIDATION_FAILED');
    expect(body.message).toContain('Invalid transition');
  });

  it('returns success payload for valid moderation update', async () => {
    const { res, body } = await callPatch({
      reviewId: 'review-1',
      status: 'approved',
      reason: 'Looks good',
    });

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, reviewId: 'review-1', newStatus: 'approved' });
    expect(mockModerateReview).toHaveBeenCalledWith(
      mockAdminClient,
      'review-1',
      'approved',
      'admin-1',
      'Looks good',
    );
  });
});
