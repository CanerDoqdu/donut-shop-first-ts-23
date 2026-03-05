import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { API_VERSION } from '@/lib/constants';

const mockValidateOrigin = vi.hoisted(() => vi.fn());

vi.mock('@/lib/security', () => ({
  validateOrigin: mockValidateOrigin,
}));

describe('CSRF enforcement on mutation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects POST /api/reviews when origin is invalid', async () => {
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden: origin not allowed' }, { status: 403 }),
    );

    const { POST } = await import('@/app/api/reviews/route');
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId: 'p1', rating: 5 }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('Forbidden');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('rejects PATCH /api/admin/reviews when origin is invalid', async () => {
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden: origin not allowed' }, { status: 403 }),
    );

    const { PATCH } = await import('@/app/api/admin/reviews/route');
    const req = new NextRequest('http://localhost/api/admin/reviews', {
      method: 'PATCH',
      body: JSON.stringify({ reviewId: 'r1', status: 'approved' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('Forbidden');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('rejects POST /api/vitals when origin is invalid', async () => {
    mockValidateOrigin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden: origin not allowed' }, { status: 403 }),
    );

    const { POST } = await import('@/app/api/vitals/route');
    const req = new NextRequest('http://localhost/api/vitals', {
      method: 'POST',
      body: JSON.stringify({ name: 'LCP', value: 1200 }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('Forbidden');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });
});
