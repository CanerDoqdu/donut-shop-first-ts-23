import { describe, it, expect } from 'vitest';
import {
  classifyError,
  classifyByErrorCode,
} from '@/lib/error-classification';

// ── Helper ──────────────────────────────────────────────────

function makeError(
  overrides: { code?: string; status?: number; type?: string } = {},
): Error & { code?: string; status?: number } {
  let error: Error;
  switch (overrides.type) {
    case 'TypeError':
      error = new TypeError('Cannot read properties of undefined');
      break;
    case 'ReferenceError':
      error = new ReferenceError('x is not defined');
      break;
    case 'RangeError':
      error = new RangeError('Maximum call stack size exceeded');
      break;
    case 'SyntaxError':
      error = new SyntaxError('Unexpected token');
      break;
    default:
      error = new Error('test error');
  }
  if (overrides.code) (error as { code?: string }).code = overrides.code;
  if (overrides.status) (error as { status?: number }).status = overrides.status;
  return error as Error & { code?: string; status?: number };
}

// ── Programmer Errors (JS built-in types) ───────────────────

describe('classifyError — Programmer errors (JS built-in types)', () => {
  it.each([
    ['TypeError', new TypeError('Cannot read property')],
    ['ReferenceError', new ReferenceError('x is not defined')],
    ['RangeError', new RangeError('stack overflow')],
    ['SyntaxError', new SyntaxError('unexpected token')],
  ])('classifies %s as programmer', (_name, error) => {
    const c = classifyError(error);
    expect(c.bucket).toBe('programmer');
    expect(c.retryable).toBe(false);
    expect(c.severity).toBe('error');
  });
});

// ── Operational Errors (by error code) ──────────────────────

describe('classifyError — Operational errors (by code)', () => {
  it.each([
    'E_AUTH_RATE_LIMITED',
    'E_AUTH_INVALID_CREDENTIALS',
    'E_AUTH_SESSION_MISSING',
    'E_VALIDATION_FAILED',
    'E_RATE_LIMITED',
    'E_CART_EXPIRED',
    'E_PRODUCT_NOT_FOUND',
    'E_PROMO_INVALID',
    'E_PROMO_EXPIRED',
    'E_PROMO_DEPLETED',
    'E_PROMO_MIN_ORDER',
    'E_OUT_OF_STOCK',
    'E_CHECKOUT_IDEMPOTENCY_CONFLICT',
  ])('classifies %s as operational', (code) => {
    const c = classifyError(makeError({ code }));
    expect(c.bucket).toBe('operational');
    expect(c.severity).toBe('warning');
  });
});

// ── Infrastructure Errors (by error code) ───────────────────

describe('classifyError — Infrastructure errors (by code)', () => {
  it.each([
    'E_DB_ORDER_CREATE_FAILED',
    'E_DB_QUERY_FAILED',
    'E_WEBHOOK_RPC_UNAVAILABLE',
    'E_STRIPE_CHECKOUT_FAILED',
    'E_STRIPE_SESSION_CREATE_FAILED',
    'E_EMAIL_SEND_FAILED',
  ])('classifies %s as infrastructure', (code) => {
    const c = classifyError(makeError({ code }));
    expect(c.bucket).toBe('infrastructure');
    expect(c.severity).toBe('error');
  });
});

// ── Retryable Flag ──────────────────────────────────────────

describe('classifyError — retryable flag', () => {
  it.each([
    'E_RATE_LIMITED',
    'E_AUTH_RATE_LIMITED',
    'E_DB_QUERY_FAILED',
    'E_WEBHOOK_RPC_UNAVAILABLE',
    'E_STRIPE_CHECKOUT_FAILED',
    'E_EMAIL_SEND_FAILED',
    'E_STOCK_RESERVE_FAILED',
  ])('marks %s as retryable', (code) => {
    const c = classifyError(makeError({ code }));
    expect(c.retryable).toBe(true);
  });

  it.each([
    'E_AUTH_INVALID_CREDENTIALS',
    'E_VALIDATION_FAILED',
    'E_CART_EXPIRED',
    'E_PROMO_INVALID',
    'E_PRODUCT_NOT_FOUND',
  ])('marks %s as NOT retryable', (code) => {
    const c = classifyError(makeError({ code }));
    expect(c.retryable).toBe(false);
  });
});

// ── Status Code Classification ──────────────────────────────

describe('classifyError — by HTTP status code', () => {
  it.each([400, 401, 403, 404, 409, 410, 422, 429])(
    'classifies status %d as operational',
    (status) => {
      const c = classifyError(makeError({ status }));
      expect(c.bucket).toBe('operational');
    },
  );

  it.each([502, 503, 504])(
    'classifies status %d as infrastructure',
    (status) => {
      const c = classifyError(makeError({ status }));
      expect(c.bucket).toBe('infrastructure');
      expect(c.retryable).toBe(true);
    },
  );

  it('marks 429 (rate limited) as retryable', () => {
    const c = classifyError(makeError({ status: 429 }));
    expect(c.retryable).toBe(true);
  });

  it('marks 409 (conflict) as retryable', () => {
    const c = classifyError(makeError({ status: 409 }));
    expect(c.retryable).toBe(true);
  });

  it('marks 400 (bad request) as NOT retryable', () => {
    const c = classifyError(makeError({ status: 400 }));
    expect(c.retryable).toBe(false);
  });
});

// ── Fallback ────────────────────────────────────────────────

describe('classifyError — fallback', () => {
  it('classifies unknown errors as programmer (bug we did not anticipate)', () => {
    const c = classifyError(new Error('unknown'));
    expect(c.bucket).toBe('programmer');
    expect(c.retryable).toBe(false);
    expect(c.severity).toBe('error');
  });

  it('classifies null/undefined as programmer', () => {
    expect(classifyError(null).bucket).toBe('programmer');
    expect(classifyError(undefined).bucket).toBe('programmer');
  });

  it('classifies string errors as programmer', () => {
    expect(classifyError('something broke').bucket).toBe('programmer');
  });
});

// ── classifyByErrorCode ─────────────────────────────────────

describe('classifyByErrorCode', () => {
  it('classifies by code alone (no Error instance)', () => {
    const c = classifyByErrorCode('E_RATE_LIMITED');
    expect(c.bucket).toBe('operational');
    expect(c.retryable).toBe(true);
  });

  it('falls back to programmer for unknown codes', () => {
    const c = classifyByErrorCode('E_UNKNOWN_CODE');
    expect(c.bucket).toBe('programmer');
  });
});

// ── Priority: JS type > Code > Status ───────────────────────

describe('classifyError — resolution priority', () => {
  it('JS type takes priority over error code', () => {
    const error = new TypeError('x');
    (error as unknown as { code: string }).code = 'E_RATE_LIMITED';
    const c = classifyError(error);
    expect(c.bucket).toBe('programmer'); // TypeError overrides code
  });

  it('error code takes priority over status', () => {
    const error = makeError({ code: 'E_RATE_LIMITED', status: 500 });
    const c = classifyError(error);
    expect(c.bucket).toBe('operational'); // code overrides 500 → infra
  });
});

// ── Options override ────────────────────────────────────────

describe('classifyError — opts override', () => {
  it('can pass code via opts', () => {
    const c = classifyError(new Error('x'), { code: 'E_DB_QUERY_FAILED' });
    expect(c.bucket).toBe('infrastructure');
  });

  it('can pass status via opts', () => {
    const c = classifyError(new Error('x'), { status: 503 });
    expect(c.bucket).toBe('infrastructure');
  });
});
