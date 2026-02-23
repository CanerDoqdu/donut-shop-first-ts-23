import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCheckoutMachine,
  getRetryCooldownMs,
  MAX_RETRIES,
} from '../../hooks/use-checkout-machine';
import type { CheckoutState, CheckoutEvent } from '../../hooks/use-checkout-machine';

// ─── Helpers ────────────────────────────────────────────────────

/** Mock sessionStorage */
function mockSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() { return store.size; },
    key: vi.fn(() => null),
  };
}

// ─── Setup ──────────────────────────────────────────────────────

let storage: ReturnType<typeof mockSessionStorage>;

beforeEach(() => {
  storage = mockSessionStorage();
  Object.defineProperty(window, 'sessionStorage', { value: storage, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Constants ──────────────────────────────────────────────────

describe('getRetryCooldownMs', () => {
  it('returns 1000ms for retry 0', () => {
    expect(getRetryCooldownMs(0)).toBe(1000);
  });

  it('returns 2000ms for retry 1', () => {
    expect(getRetryCooldownMs(1)).toBe(2000);
  });

  it('returns 4000ms for retry 2+', () => {
    expect(getRetryCooldownMs(2)).toBe(4000);
    expect(getRetryCooldownMs(5)).toBe(4000);
  });
});

describe('MAX_RETRIES', () => {
  it('equals 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});

// ─── Valid transitions (happy path) ─────────────────────────────

describe('useCheckoutMachine — valid transitions', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.redirectUrl).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.canRetry).toBe(false);
  });

  it('idle → validating → reserving → redirecting → success', () => {
    const { result } = renderHook(() => useCheckoutMachine());

    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    expect(result.current.state).toBe('validating');
    expect(result.current.isBusy).toBe(true);

    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    expect(result.current.state).toBe('reserving');
    expect(result.current.isBusy).toBe(true);

    act(() => result.current.send({ type: 'RESERVATION_OK', url: 'https://stripe.com/pay' }));
    expect(result.current.state).toBe('redirecting');
    expect(result.current.redirectUrl).toBe('https://stripe.com/pay');
    expect(result.current.isBusy).toBe(true);

    act(() => result.current.send({ type: 'REDIRECT_OK' }));
    expect(result.current.state).toBe('success');
    expect(result.current.isBusy).toBe(false);
  });

  it('RESET from success returns to idle', () => {
    const { result } = renderHook(() => useCheckoutMachine());

    // Reach success
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    act(() => result.current.send({ type: 'RESERVATION_OK', url: 'https://stripe.com/pay' }));
    act(() => result.current.send({ type: 'REDIRECT_OK' }));
    expect(result.current.state).toBe('success');

    act(() => result.current.reset());
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.redirectUrl).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });
});

// ─── Invalid transitions (no-op) ───────────────────────────────

describe('useCheckoutMachine — invalid transitions', () => {
  it('idle + VALIDATION_OK → no-op (stays idle)', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    expect(result.current.state).toBe('idle');
  });

  it('idle + RESERVATION_OK → no-op', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'RESERVATION_OK', url: 'x' }));
    expect(result.current.state).toBe('idle');
  });

  it('success + START_CHECKOUT → no-op', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    act(() => result.current.send({ type: 'RESERVATION_OK', url: 'x' }));
    act(() => result.current.send({ type: 'REDIRECT_OK' }));
    expect(result.current.state).toBe('success');

    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    expect(result.current.state).toBe('success');
  });

  it('validating + RESERVATION_OK → no-op (must go through VALIDATION_OK)', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    expect(result.current.state).toBe('validating');

    act(() => result.current.send({ type: 'RESERVATION_OK', url: 'x' }));
    expect(result.current.state).toBe('validating');
  });
});

// ─── Failure transitions ────────────────────────────────────────

describe('useCheckoutMachine — failure paths', () => {
  it('validating + VALIDATION_FAIL → failed with error', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_FAIL', error: 'bad email' }));

    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('bad email');
    expect(result.current.canRetry).toBe(true);
  });

  it('reserving + RESERVATION_FAIL → failed with error', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    act(() => result.current.send({ type: 'RESERVATION_FAIL', error: 'Stripe error' }));

    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('Stripe error');
  });

  it('reserving + TIMEOUT → timeout with error message', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    act(() => result.current.send({ type: 'TIMEOUT' }));

    expect(result.current.state).toBe('timeout');
    expect(result.current.error).toContain('timed out');
    expect(result.current.canRetry).toBe(true);
  });
});

// ─── Bug #1: CART_SYNC_FAILED ───────────────────────────────────

describe('useCheckoutMachine — Bug #1: CART_SYNC_FAILED', () => {
  it('transitions reserving → failed when cart sync fails', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    expect(result.current.state).toBe('reserving');

    act(() => result.current.send({ type: 'CART_SYNC_FAILED', error: 'Stock check failed' }));
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('Stock check failed');
  });

  it('transitions validating → failed on CART_SYNC_FAILED', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    expect(result.current.state).toBe('validating');

    act(() => result.current.send({ type: 'CART_SYNC_FAILED', error: 'Rollback triggered' }));
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('Rollback triggered');
  });

  it('transitions idle → failed on CART_SYNC_FAILED', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'CART_SYNC_FAILED', error: 'Cart empty' }));
    expect(result.current.state).toBe('failed');
  });

  it('transitions redirecting → failed on CART_SYNC_FAILED', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    act(() => result.current.send({ type: 'RESERVATION_OK', url: 'https://stripe.com/pay' }));
    expect(result.current.state).toBe('redirecting');

    act(() => result.current.send({ type: 'CART_SYNC_FAILED', error: 'Sync lost' }));
    expect(result.current.state).toBe('failed');
  });
});

// ─── Bug #2: CART_CLEARED_EXTERNAL ──────────────────────────────

describe('useCheckoutMachine — Bug #2: CART_CLEARED_EXTERNAL', () => {
  it('transitions reserving → failed when cart cleared externally', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    expect(result.current.state).toBe('reserving');

    act(() => result.current.send({ type: 'CART_CLEARED_EXTERNAL' }));
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toContain('another tab');
  });

  it('idle + CART_CLEARED_EXTERNAL → stays idle', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'CART_CLEARED_EXTERNAL' }));
    expect(result.current.state).toBe('idle');
  });

  it('validating + CART_CLEARED_EXTERNAL → failed', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'CART_CLEARED_EXTERNAL' }));
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toContain('another tab');
  });
});

// ─── Retry logic ────────────────────────────────────────────────

describe('useCheckoutMachine — retry', () => {
  it('failed + RETRY → idle, retryCount increments', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_FAIL', error: 'err' }));
    expect(result.current.state).toBe('failed');
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);

    act(() => result.current.send({ type: 'RETRY' }));
    expect(result.current.state).toBe('idle');
    expect(result.current.retryCount).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('timeout + RETRY → idle', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_OK' }));
    act(() => result.current.send({ type: 'TIMEOUT' }));
    expect(result.current.state).toBe('timeout');

    act(() => result.current.send({ type: 'RETRY' }));
    expect(result.current.state).toBe('idle');
    expect(result.current.retryCount).toBe(1);
  });

  it('canRetry becomes false after MAX_RETRIES', () => {
    const { result } = renderHook(() => useCheckoutMachine());

    for (let i = 0; i < MAX_RETRIES; i++) {
      act(() => result.current.send({ type: 'START_CHECKOUT' }));
      act(() => result.current.send({ type: 'VALIDATION_FAIL', error: `err-${i}` }));
      expect(result.current.canRetry).toBe(true);
      act(() => result.current.send({ type: 'RETRY' }));
    }

    // After MAX_RETRIES retries, fail again
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_FAIL', error: 'final' }));
    expect(result.current.retryCount).toBe(MAX_RETRIES);
    expect(result.current.canRetry).toBe(false);
  });

  it('RESET clears retryCount', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_FAIL', error: 'err' }));
    act(() => result.current.send({ type: 'RETRY' }));
    expect(result.current.retryCount).toBe(1);

    act(() => result.current.reset());
    expect(result.current.retryCount).toBe(0);
  });
});

// ─── SessionStorage persistence ─────────────────────────────────

describe('useCheckoutMachine — sessionStorage', () => {
  it('persists state to sessionStorage on transition', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));

    expect(storage.setItem).toHaveBeenCalled();
    const stored = JSON.parse(storage.setItem.mock.calls.at(-1)![1]);
    expect(stored.state).toBe('validating');
  });

  it('clears sessionStorage when returning to idle', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.send({ type: 'VALIDATION_FAIL', error: 'err' }));
    act(() => result.current.send({ type: 'RETRY' }));

    // RETRY → idle → should remove
    expect(storage.removeItem).toHaveBeenCalledWith('donut-checkout-machine');
  });

  it('clears sessionStorage on reset()', () => {
    const { result } = renderHook(() => useCheckoutMachine());
    act(() => result.current.send({ type: 'START_CHECKOUT' }));
    act(() => result.current.reset());

    expect(storage.removeItem).toHaveBeenCalledWith('donut-checkout-machine');
  });

  it('hydrates from sessionStorage on mount', () => {
    // Pre-populate sessionStorage with a persisted "failed" state
    const persisted = {
      state: 'failed',
      error: 'Previous error',
      redirectUrl: null,
      retryCount: 1,
      lastTransitionAt: Date.now(),
    };
    storage.getItem.mockReturnValue(JSON.stringify(persisted));

    const { result } = renderHook(() => useCheckoutMachine());
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('Previous error');
    expect(result.current.retryCount).toBe(1);
  });

  it('ignores stale transient states (>5 min old)', () => {
    const STALE_MS = 5 * 60 * 1000 + 1;
    const persisted = {
      state: 'reserving',
      error: null,
      redirectUrl: null,
      retryCount: 0,
      lastTransitionAt: Date.now() - STALE_MS,
    };
    storage.getItem.mockReturnValue(JSON.stringify(persisted));

    const { result } = renderHook(() => useCheckoutMachine());
    // Should fall back to initial state because "reserving" is stale
    expect(result.current.state).toBe('idle');
  });
});

// ─── isBusy computation ─────────────────────────────────────────

describe('useCheckoutMachine — isBusy', () => {
  it.each<[CheckoutEvent[], boolean]>([
    [[], false], // idle
    [[{ type: 'START_CHECKOUT' }], true], // validating
    [[{ type: 'START_CHECKOUT' }, { type: 'VALIDATION_FAIL', error: 'e' }], false], // failed
  ])('isBusy after events %j is %s', (events, expected) => {
    const { result } = renderHook(() => useCheckoutMachine());
    events.forEach((event) => {
      act(() => result.current.send(event));
    });
    expect(result.current.isBusy).toBe(expected);
  });
});
