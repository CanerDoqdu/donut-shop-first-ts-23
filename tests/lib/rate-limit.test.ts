import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// Reset the internal store between tests by re-importing
// Since the store is module-scoped, we use dynamic import + vi.resetModules

describe('rateLimit', () => {
  beforeEach(() => {
    // Advance past any existing token windows
    vi.useFakeTimers();
  });

  it('allows requests within limit', () => {
    const id = `test-allow-${Date.now()}`;
    const result = rateLimit(id, { maxRequests: 5, windowSizeSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 1 = 4
  });

  it('blocks requests after limit exceeded', () => {
    const id = `test-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      rateLimit(id, { maxRequests: 5, windowSizeSeconds: 60 });
    }
    const blocked = rateLimit(id, { maxRequests: 5, windowSizeSeconds: 60 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('refills tokens after window elapses', () => {
    const id = `test-refill-${Date.now()}`;
    // Exhaust all tokens
    for (let i = 0; i < 5; i++) {
      rateLimit(id, { maxRequests: 5, windowSizeSeconds: 60 });
    }
    const blocked = rateLimit(id, { maxRequests: 5, windowSizeSeconds: 60 });
    expect(blocked.success).toBe(false);

    // Advance time past window
    vi.advanceTimersByTime(61_000);

    const refreshed = rateLimit(id, { maxRequests: 5, windowSizeSeconds: 60 });
    expect(refreshed.success).toBe(true);
  });

  it('decrements remaining correctly', () => {
    const id = `test-decrement-${Date.now()}`;
    const r1 = rateLimit(id, { maxRequests: 3, windowSizeSeconds: 60 });
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(id, { maxRequests: 3, windowSizeSeconds: 60 });
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(id, { maxRequests: 3, windowSizeSeconds: 60 });
    expect(r3.remaining).toBe(0);
  });

  it('uses default values when options not provided', () => {
    const id = `test-defaults-${Date.now()}`;
    const result = rateLimit(id);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9); // default maxRequests=10, so 10-1=9
  });

  it('returns reset timestamp', () => {
    const id = `test-reset-${Date.now()}`;
    const result = rateLimit(id, { maxRequests: 5, windowSizeSeconds: 120 });
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ─── getClientIP ───────────────────────────────────────────────

describe('getClientIP', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('falls back to 127.0.0.1 when no headers', () => {
    const req = new Request('http://localhost');
    expect(getClientIP(req)).toBe('127.0.0.1');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      },
    });
    expect(getClientIP(req)).toBe('1.1.1.1');
  });
});

// ─── stopRateLimitCleanup ─────────────────────────────────────

import { stopRateLimitCleanup } from '@/lib/rate-limit';

describe('stopRateLimitCleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('can be called before ensureCleanup starts the timer', () => {
    // Should not throw even if cleanup hasn't started
    expect(() => stopRateLimitCleanup()).not.toThrow();
  });

  it('stops the cleanup timer after it has been started', () => {
    // Trigger cleanup timer by making a rateLimit call
    const id = `cleanup-test-${Date.now()}`;
    rateLimit(id, { maxRequests: 10, windowSizeSeconds: 60 });

    // Should not throw when stopping
    expect(() => stopRateLimitCleanup()).not.toThrow();

    // Calling again is safe (idempotent)
    expect(() => stopRateLimitCleanup()).not.toThrow();
  });

  it('cleanup timer deletes stale entries after 10 minutes', () => {
    const staleId = `stale-${Date.now()}`;
    rateLimit(staleId, { maxRequests: 3, windowSizeSeconds: 60 });

    // Advance time past 10 minutes (entry becomes stale after 600_000 ms)
    vi.advanceTimersByTime(700_000);

    // Now if rate limit is called again for this ID, it should be a fresh entry
    const result = rateLimit(staleId, { maxRequests: 3, windowSizeSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2); // fresh bucket: 3-1=2

    stopRateLimitCleanup();
  });
});
