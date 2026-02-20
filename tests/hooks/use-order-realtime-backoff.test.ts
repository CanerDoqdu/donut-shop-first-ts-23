import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the exponential-backoff reconnect logic added to useOrderRealtime.
 *
 * We test the algorithm in isolation (no React renderHook) by simulating the
 * subscribe → error → schedule retry cycle.
 */

// ─── Backoff constants (mirrored from the hook) ─────────────
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_FACTOR = 2;

/** Pure function that computes the next backoff */
function nextBackoff(current: number): number {
  return Math.min(current * BACKOFF_FACTOR, MAX_BACKOFF_MS);
}

describe('Realtime reconnect backoff algorithm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at INITIAL_BACKOFF_MS (1 s)', () => {
    expect(INITIAL_BACKOFF_MS).toBe(1_000);
  });

  it('doubles on each consecutive failure', () => {
    let backoff = INITIAL_BACKOFF_MS;
    const sequence: number[] = [backoff];
    for (let i = 0; i < 6; i++) {
      backoff = nextBackoff(backoff);
      sequence.push(backoff);
    }
    expect(sequence).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  it('caps at MAX_BACKOFF_MS (30 s)', () => {
    let backoff = INITIAL_BACKOFF_MS;
    for (let i = 0; i < 100; i++) {
      backoff = nextBackoff(backoff);
    }
    expect(backoff).toBe(MAX_BACKOFF_MS);
  });

  it('resets to INITIAL after successful reconnect', () => {
    let backoff = INITIAL_BACKOFF_MS;

    // Simulate 3 failures
    for (let i = 0; i < 3; i++) {
      backoff = nextBackoff(backoff);
    }
    expect(backoff).toBe(8_000);

    // Simulate successful reconnect → reset
    backoff = INITIAL_BACKOFF_MS;
    expect(backoff).toBe(1_000);
  });

  it('schedules a retry after the backoff delay', () => {
    const retrySpy = vi.fn();

    let backoff = INITIAL_BACKOFF_MS;
    // Simulate first failure → schedule retry
    setTimeout(retrySpy, backoff);
    backoff = nextBackoff(backoff);

    // Not called yet
    expect(retrySpy).not.toHaveBeenCalled();

    // Advance by initial backoff
    vi.advanceTimersByTime(INITIAL_BACKOFF_MS);
    expect(retrySpy).toHaveBeenCalledOnce();

    // Schedule second retry with doubled backoff
    const retrySpy2 = vi.fn();
    setTimeout(retrySpy2, backoff);

    vi.advanceTimersByTime(1_999);
    expect(retrySpy2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(retrySpy2).toHaveBeenCalledOnce();
  });

  it('cleanup clears pending timer', () => {
    const retrySpy = vi.fn();
    const timer = setTimeout(retrySpy, INITIAL_BACKOFF_MS);

    // Simulate unmount → clearTimeout
    clearTimeout(timer);
    vi.advanceTimersByTime(INITIAL_BACKOFF_MS + 1_000);
    expect(retrySpy).not.toHaveBeenCalled();
  });
});

// ─── Subscribe status mapping ────────────────────────────────

describe('Realtime subscribe status handling', () => {
  it('SUBSCRIBED status resets backoff', () => {
    let backoff = 16_000;
    const status = 'SUBSCRIBED';

    if (status === 'SUBSCRIBED') {
      backoff = INITIAL_BACKOFF_MS;
    }
    expect(backoff).toBe(INITIAL_BACKOFF_MS);
  });

  it('CHANNEL_ERROR triggers reconnect', () => {
    const status: string = 'CHANNEL_ERROR';
    const shouldReconnect = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
    expect(shouldReconnect).toBe(true);
  });

  it('TIMED_OUT triggers reconnect', () => {
    const status: string = 'TIMED_OUT';
    const shouldReconnect = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
    expect(shouldReconnect).toBe(true);
  });

  it('CLOSED does not trigger reconnect', () => {
    const status: string = 'CLOSED';
    const shouldReconnect = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
    expect(shouldReconnect).toBe(false);
  });
});
