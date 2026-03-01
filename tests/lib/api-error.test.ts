import { describe, it, expect } from 'vitest';
import { ApiError, getRequestId, apiErrorResponse } from '@/lib/api-error';

describe('ApiError', () => {
  it('creates an error with code, message, status', () => {
    const err = new ApiError('NOT_FOUND', 'Item not found', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Item not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults status to 500', () => {
    const err = new ApiError('INTERNAL', 'Something broke');
    expect(err.status).toBe(500);
  });

  it('stores optional headers for response forwarding', () => {
    const err = new ApiError('E_RATE_LIMITED', 'Slow down', 429, {
      headers: { 'Retry-After': '60' },
    });
    expect(err.headers).toEqual({ 'Retry-After': '60' });
  });

  it('headers default to undefined', () => {
    const err = new ApiError('E_INTERNAL', 'Oops', 500);
    expect(err.headers).toBeUndefined();
  });
});

describe('getRequestId', () => {
  it('returns x-request-id header when present', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-request-id': 'test-123' },
    });
    expect(getRequestId(req)).toBe('test-123');
  });

  it('generates a UUID when header is missing', () => {
    const req = new Request('http://localhost');
    const id = getRequestId(req);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('apiErrorResponse', () => {
  it('returns a NextResponse with standard shape', async () => {
    const res = apiErrorResponse('VALIDATION_ERROR', 'Bad input', 400, 'req-1');
    expect(res.status).toBe(400);
    expect(res.headers.get('x-request-id')).toBe('req-1');
    const body = await res.json();
    expect(body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Bad input',
      requestId: 'req-1',
    });
  });

  it('merges headers and includes optional details', async () => {
    const res = apiErrorResponse(
      'RATE_LIMITED',
      'Slow down',
      429,
      'req-2',
      { headers: { 'Retry-After': '60' }, details: { limit: 30 } },
    );

    expect(res.headers.get('Retry-After')).toBe('60');
    const body = await res.json();
    expect(body).toEqual({
      code: 'RATE_LIMITED',
      message: 'Slow down',
      requestId: 'req-2',
      details: { limit: 30 },
    });
  });
});
