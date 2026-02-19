import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';

/**
 * Contract tests for the withHandler HOF.
 *
 * Validates the standardised response contract:
 *  - Success → original response + x-request-id header
 *  - ApiError → { code, message, requestId } with correct status
 *  - Unknown error → 500 with INTERNAL_ERROR code
 */

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('withHandler — response contract', () => {
  // ── Success path ───────────────────────────────────────────

  it('passes requestId to handler and attaches x-request-id header', async () => {
    const handler = withHandler(async (_req, { requestId }) => {
      return NextResponse.json({ ok: true, requestId });
    });

    const res = await handler(makeRequest({ 'x-request-id': 'test-rid-123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('test-rid-123');
    expect(body.requestId).toBe('test-rid-123');
  });

  it('generates a UUID requestId when header is missing', async () => {
    const handler = withHandler(async (_req, { requestId }) => {
      return NextResponse.json({ requestId });
    });

    const res = await handler(makeRequest());
    const rid = res.headers.get('x-request-id');

    expect(rid).toBeTruthy();
    // UUID v4 format: 8-4-4-4-12
    expect(rid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  // ── ApiError path ──────────────────────────────────────────

  it('converts ApiError to { code, message, requestId } JSON', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_TEST_ERROR', 'Something went wrong', 422);
    });

    const res = await handler(makeRequest({ 'x-request-id': 'rid-err' }));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body).toEqual({
      code: 'E_TEST_ERROR',
      message: 'Something went wrong',
      requestId: 'rid-err',
    });
    expect(res.headers.get('x-request-id')).toBe('rid-err');
  });

  it('uses default 500 status when ApiError has no explicit status', async () => {
    const handler = withHandler(async () => {
      throw new ApiError('E_DB_FAIL', 'DB down');
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('E_DB_FAIL');
  });

  // ── Unknown error path ─────────────────────────────────────

  it('catches unknown errors and returns INTERNAL_ERROR 500', async () => {
    const handler = withHandler(async () => {
      throw new Error('unexpected crash');
    });

    const res = await handler(makeRequest({ 'x-request-id': 'rid-crash' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('An unexpected error occurred');
    expect(body.requestId).toBe('rid-crash');
    expect(res.headers.get('x-request-id')).toBe('rid-crash');
  });

  it('catches non-Error throws (string, object)', async () => {
    const handler = withHandler(async () => {
      throw 'string error';
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  // ── Header propagation ─────────────────────────────────────

  it('preserves custom headers set by the handler', async () => {
    const handler = withHandler(async () => {
      return NextResponse.json({ ok: true }, {
        headers: { 'X-Custom': 'value' },
      });
    });

    const res = await handler(makeRequest());
    expect(res.headers.get('x-custom')).toBe('value');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
