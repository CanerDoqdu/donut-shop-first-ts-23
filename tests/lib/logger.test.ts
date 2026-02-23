import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the module exports, so import after potential mocks
import { logger, extractRequestId, extractCorrelationId, createRequestLogger, startTimer } from '@/lib/logger';
import type { Logger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/*  logger.metric / logger.count                                       */
/* ------------------------------------------------------------------ */
describe('logger.metric()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a structured info log with metric name and value', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.metric('checkout_duration_ms', 340, { orderId: 'ord_1' });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('metric.checkout_duration_ms');
    expect(parsed.metric).toBe('checkout_duration_ms');
    expect(parsed.value).toBe(340);
    expect(parsed.orderId).toBe('ord_1');
    expect(parsed.service).toBe('donut-shop');
  });

  it('works without optional metadata', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.metric('latency_ms', 50);

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.metric).toBe('latency_ms');
    expect(parsed.value).toBe(50);
  });
});

describe('logger.count()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a counter with value 1', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.count('checkout_error', { code: 'E_STRIPE' });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.message).toBe('metric.checkout_error');
    expect(parsed.metric).toBe('checkout_error');
    expect(parsed.value).toBe(1);
    expect(parsed.code).toBe('E_STRIPE');
  });
});

/* ------------------------------------------------------------------ */
/*  logger.withContext — metrics inherit context                        */
/* ------------------------------------------------------------------ */
describe('logger.withContext() + metric', () => {
  it('merges context into metric log lines', () => {
    vi.restoreAllMocks();
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const log: Logger = logger.withContext({ requestId: 'req_abc' });
    log.metric('webhook_duration_ms', 120);

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.requestId).toBe('req_abc');
    expect(parsed.metric).toBe('webhook_duration_ms');
    expect(parsed.value).toBe(120);
  });
});

/* ------------------------------------------------------------------ */
/*  extractRequestId                                                    */
/* ------------------------------------------------------------------ */
describe('extractRequestId()', () => {
  it('returns the x-request-id header when present', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-request-id': 'custom-id-123' },
    });

    expect(extractRequestId(req)).toBe('custom-id-123');
  });

  it('generates a UUID when header is missing', () => {
    const req = new Request('http://localhost');
    const id = extractRequestId(req);

    // UUID v4 pattern: 8-4-4-4-12 hex characters
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('returns different UUIDs for different requests without header', () => {
    const req1 = new Request('http://localhost');
    const req2 = new Request('http://localhost');

    expect(extractRequestId(req1)).not.toBe(extractRequestId(req2));
  });
});

/* ------------------------------------------------------------------ */
/*  startTimer                                                          */
/* ------------------------------------------------------------------ */
describe('startTimer()', () => {
  it('returns elapsed time in milliseconds', async () => {
    const elapsed = startTimer();

    // Wait briefly to ensure non-zero elapsed time
    await new Promise((resolve) => setTimeout(resolve, 20));

    const ms = elapsed();
    expect(ms).toBeGreaterThanOrEqual(1); // at least 1ms (rounded)
    expect(typeof ms).toBe('number');
    expect(Number.isInteger(ms)).toBe(true); // Math.round
  });

  it('can be called multiple times (monotonically increasing)', async () => {
    const elapsed = startTimer();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const first = elapsed();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = elapsed();

    expect(second).toBeGreaterThanOrEqual(first);
  });
});

/* ------------------------------------------------------------------ */
/*  logger.classifiedError                                              */
/* ------------------------------------------------------------------ */
describe('logger.classifiedError()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs operational errors at warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const error = Object.assign(new Error('rate limited'), { code: 'E_RATE_LIMITED', status: 429 });
    logger.classifiedError('checkout blocked', error);

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('warn');
    expect(parsed['error.bucket']).toBe('operational');
    expect(parsed['error.retryable']).toBe(true);
    expect(parsed['error.message']).toBe('rate limited');
  });

  it('logs programmer errors at error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.classifiedError('null ref crash', new TypeError('Cannot read'));

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed['error.bucket']).toBe('programmer');
    expect(parsed['error.retryable']).toBe(false);
  });

  it('logs infrastructure errors at error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = Object.assign(new Error('DB down'), { code: 'E_DB_QUERY_FAILED' });
    logger.classifiedError('query failed', error);

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed['error.bucket']).toBe('infrastructure');
    expect(parsed['error.retryable']).toBe(true);
  });

  it('includes extra metadata', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.classifiedError('fail', new Error('x'), { orderId: 'ord-1' });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.orderId).toBe('ord-1');
  });

  it('merges context from withContext', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const log = logger.withContext({ requestId: 'req-1' });
    log.classifiedError('fail', new Error('x'));

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.requestId).toBe('req-1');
    expect(parsed['error.bucket']).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  extractCorrelationId                                                */
/* ------------------------------------------------------------------ */
describe('extractCorrelationId()', () => {
  it('returns the x-correlation-id header when present', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-correlation-id': 'corr-123' },
    });
    expect(extractCorrelationId(req)).toBe('corr-123');
  });

  it('generates a UUID when header is missing', () => {
    const req = new Request('http://localhost');
    const id = extractCorrelationId(req);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('returns different UUIDs for different requests without header', () => {
    const req1 = new Request('http://localhost');
    const req2 = new Request('http://localhost');
    expect(extractCorrelationId(req1)).not.toBe(extractCorrelationId(req2));
  });
});

/* ------------------------------------------------------------------ */
/*  createRequestLogger                                                 */
/* ------------------------------------------------------------------ */
describe('createRequestLogger()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a logger pre-loaded with requestId, correlationId, path, method', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: {
        'x-request-id': 'req-abc',
        'x-correlation-id': 'corr-xyz',
      },
    });

    const log = createRequestLogger(req);
    log.info('checkout started');

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.requestId).toBe('req-abc');
    expect(parsed.correlationId).toBe('corr-xyz');
    expect(parsed.path).toBe('/api/checkout');
    expect(parsed.method).toBe('POST');
    expect(parsed.message).toBe('checkout started');
  });

  it('merges extra context via second argument', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const req = new Request('http://localhost/api/orders');
    const log = createRequestLogger(req, { userId: 'user-1' });
    log.info('listing orders');

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.userId).toBe('user-1');
  });

  it('supports classifiedError on request-scoped logger', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'x-request-id': 'req-1', 'x-correlation-id': 'corr-1' },
    });

    const log = createRequestLogger(req);
    log.classifiedError('fail', new TypeError('x'));

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.requestId).toBe('req-1');
    expect(parsed.correlationId).toBe('corr-1');
    expect(parsed['error.bucket']).toBe('programmer');
  });
});
