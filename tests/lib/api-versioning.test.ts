/**
 * API Versioning contract tests.
 *
 * Ensures every API response carries the `x-api-version` header
 * with the correct value from `lib/constants.ts`.
 *
 * @see docs/API-VERSIONING.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { API_VERSION } from '@/lib/constants';
import { withHandler, withVersionHeader } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';

// ── Mocks ────────────────────────────────────────────────────
vi.mock('@/lib/security', () => ({ validateOrigin: vi.fn().mockReturnValue(null) }));
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => {
    cb({ setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() });
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

function makeReq(path = '/api/test', method = 'GET'): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method });
}

// ── withHandler tests ────────────────────────────────────────
describe('withHandler — x-api-version header', () => {
  beforeEach(() => vi.clearAllMocks());

  it('attaches x-api-version on success response', async () => {
    const handler = withHandler(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq());

    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('attaches x-api-version on ApiError response', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_VALIDATION_FAILED', 'bad', 400);
    });
    const res = await handler(makeReq());

    expect(res.status).toBe(400);
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('attaches x-api-version on unhandled error response', async () => {
    const handler = withHandler(async () => {
      throw new Error('boom');
    });
    const res = await handler(makeReq());

    expect(res.status).toBe(500);
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('version header value matches constants.API_VERSION exactly', async () => {
    const handler = withHandler(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq());

    // Validate the format is a valid YYYY-MM-DD date
    expect(API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });
});

// ── withVersionHeader utility tests ──────────────────────────
describe('withVersionHeader — utility', () => {
  it('sets x-api-version on a plain NextResponse', () => {
    const res = withVersionHeader(NextResponse.json({ ok: true }));
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('sets x-api-version on an error response', () => {
    const res = withVersionHeader(
      NextResponse.json({ error: 'bad' }, { status: 400 }),
    );
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
    expect(res.status).toBe(400);
  });

  it('preserves existing headers when adding version', () => {
    const res = NextResponse.json(
      { ok: true },
      { headers: { 'x-request-id': 'abc-123' } },
    );
    withVersionHeader(res);
    expect(res.headers.get('x-request-id')).toBe('abc-123');
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('returns the same response object (no clone)', () => {
    const original = NextResponse.json({ ok: true });
    const result = withVersionHeader(original);
    expect(result).toBe(original);
  });
});

// ── API_VERSION constant tests ───────────────────────────────
describe('API_VERSION constant', () => {
  it('is a valid YYYY-MM-DD date string', () => {
    expect(API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Ensure it's a parseable date
    const parsed = new Date(API_VERSION);
    expect(parsed.toString()).not.toBe('Invalid Date');
  });

  it('is not empty', () => {
    expect(API_VERSION.length).toBeGreaterThan(0);
  });
});
