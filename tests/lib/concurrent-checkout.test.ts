import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createInflightGuard,
  createStaleGuard,
  simulateConcurrent,
  watchCartChanges,
} from '@/lib/concurrency';

// ── Suppress logger if imported transitively ─────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    withContext: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// =============================================
// createInflightGuard
// =============================================
describe('createInflightGuard', () => {
  it('returns the same promise for concurrent calls', async () => {
    let callCount = 0;
    const slowFn = async (x: number) => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return x * 2;
    };

    const guarded = createInflightGuard(slowFn);

    // Fire two calls "simultaneously"
    const p1 = guarded(5);
    const p2 = guarded(10); // args ignored — returns same promise

    expect(p1).toBe(p2); // exact same promise reference

    const result = await p1;
    expect(result).toBe(10); // first call's args used
    expect(callCount).toBe(1); // only 1 actual invocation
  });

  it('allows a new call after previous resolves', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x;
    };

    const guarded = createInflightGuard(fn);

    const r1 = await guarded(1);
    expect(r1).toBe(1);
    expect(callCount).toBe(1);

    const r2 = await guarded(2);
    expect(r2).toBe(2);
    expect(callCount).toBe(2);
  });

  it('resets after rejection so next call can proceed', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount === 1) throw new Error('fail');
      return 'ok';
    };

    const guarded = createInflightGuard(fn);

    await expect(guarded()).rejects.toThrow('fail');
    expect(callCount).toBe(1);

    // After failure, inflight is cleared — new call should work
    const result = await guarded();
    expect(result).toBe('ok');
    expect(callCount).toBe(2);
  });

  it('prevents triple-click scenario (3 concurrent calls)', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 30));
      return 'done';
    };

    const guarded = createInflightGuard(fn);

    const p1 = guarded();
    const p2 = guarded();
    const p3 = guarded();

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);

    await p1;
    expect(callCount).toBe(1);
  });
});

// =============================================
// createStaleGuard
// =============================================
describe('createStaleGuard', () => {
  it('starts at generation 0', () => {
    const guard = createStaleGuard();
    expect(guard.current()).toBe(0);
  });

  it('bumps generation on each call', () => {
    const guard = createStaleGuard();
    expect(guard.bump()).toBe(1);
    expect(guard.bump()).toBe(2);
    expect(guard.current()).toBe(2);
  });

  it('detects stale generation', () => {
    const guard = createStaleGuard();
    const captured = guard.current(); // 0
    guard.bump(); // 1
    expect(guard.isStale(captured)).toBe(true);
  });

  it('current generation is not stale', () => {
    const guard = createStaleGuard();
    guard.bump();
    const captured = guard.current(); // 1
    expect(guard.isStale(captured)).toBe(false);
  });

  it('resets to 0', () => {
    const guard = createStaleGuard();
    guard.bump();
    guard.bump();
    guard.reset();
    expect(guard.current()).toBe(0);
  });
});

// =============================================
// simulateConcurrent
// =============================================
describe('simulateConcurrent', () => {
  it('fires N concurrent calls and collects results', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'result';
    };

    const results = await simulateConcurrent(fn, 3);

    expect(callCount).toBe(3);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('collects both fulfilled and rejected results', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount === 2) throw new Error('conflict');
      return `ok-${callCount}`;
    };

    const results = await simulateConcurrent(fn, 3);

    expect(results).toHaveLength(3);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(1);
  });

  it('defaults to 2 concurrent calls', async () => {
    let callCount = 0;
    const fn = async () => { callCount++; };

    await simulateConcurrent(fn);

    expect(callCount).toBe(2);
  });
});

// =============================================
// Concurrent checkout simulation (integration)
// =============================================
describe('concurrent checkout simulation', () => {
  it('idempotency guard: only 1 of N concurrent calls proceeds', async () => {
    // Simulate server-side behavior:
    // First call with idempotencyKey → creates order
    // Subsequent calls with same key → 409 Conflict
    const processedKeys = new Set<string>();
    let orderCount = 0;

    const checkoutHandler = async (idempotencyKey: string) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 10));

      if (processedKeys.has(idempotencyKey)) {
        return { status: 409, error: 'Duplicate checkout request' };
      }

      processedKeys.add(idempotencyKey);
      orderCount++;
      return { status: 200, orderId: `order-${orderCount}` };
    };

    const key = 'test-idem-key-123';

    // Fire 5 concurrent requests with the same idempotency key
    const results = await simulateConcurrent(
      () => checkoutHandler(key),
      5,
    );

    // All should settle (no crashes)
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

    // Only 1 order created
    expect(orderCount).toBe(1);

    // Verify: 1 success (200), 4 conflicts (409)
    const values = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<{ status: number }>).value.status);

    expect(values.filter((s) => s === 200).length).toBe(1);
    expect(values.filter((s) => s === 409).length).toBe(4);
  });

  it('inflight guard + idempotency: double-click creates exactly 1 request', async () => {
    let serverCalls = 0;

    const serverCheckout = async () => {
      serverCalls++;
      await new Promise((r) => setTimeout(r, 50));
      return { orderId: 'ord-1', url: 'https://stripe.com/pay' };
    };

    const guarded = createInflightGuard(serverCheckout);

    // Simulate rapid double-click
    const p1 = guarded();
    const p2 = guarded();

    const [r1, r2] = await Promise.all([p1, p2]);

    // Both resolve to the same result
    expect(r1).toEqual(r2);
    expect(r1.orderId).toBe('ord-1');

    // Only 1 server call made
    expect(serverCalls).toBe(1);
  });

  it('stale guard prevents processing response for modified cart', async () => {
    const guard = createStaleGuard();

    // Capture generation before checkout
    const checkoutGeneration = guard.current();

    // Simulate: cart modified while checkout is in-flight
    guard.bump();

    // When response arrives, it's stale
    expect(guard.isStale(checkoutGeneration)).toBe(true);

    // The application should discard the stale result
    // (not redirect to Stripe for a cart that no longer matches)
  });

  it('concurrent calls with different idempotency keys create separate orders', async () => {
    const orders = new Map<string, string>();
    let orderNum = 0;

    const checkoutHandler = async (idempotencyKey: string) => {
      await new Promise((r) => setTimeout(r, 10));

      if (orders.has(idempotencyKey)) {
        return { status: 409, orderId: orders.get(idempotencyKey) };
      }

      orderNum++;
      const orderId = `order-${orderNum}`;
      orders.set(idempotencyKey, orderId);
      return { status: 200, orderId };
    };

    // 3 calls with different keys (different tabs/users)
    const results = await Promise.allSettled([
      checkoutHandler('key-tab-1'),
      checkoutHandler('key-tab-2'),
      checkoutHandler('key-tab-3'),
    ]);

    const fulfilled = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<{ status: number; orderId: string }>).value);

    // All succeed with different orders
    expect(fulfilled).toHaveLength(3);
    expect(fulfilled.every((r) => r.status === 200)).toBe(true);
    expect(orderNum).toBe(3);
  });
});

// =============================================
// watchCartChanges
// =============================================
describe('watchCartChanges', () => {
  const CART_KEY = 'donut-cart';
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  function fireStorageEvent(key: string, newValue: string | null) {
    const event = new StorageEvent('storage', { key, newValue });
    window.dispatchEvent(event);
  }

  it('registers and removes storage listener', () => {
    const cleanup = watchCartChanges(CART_KEY, vi.fn());

    expect(addSpy).toHaveBeenCalledWith('storage', expect.any(Function));

    cleanup();

    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('calls onClear when cart is removed (newValue=null)', () => {
    const onClear = vi.fn();
    const cleanup = watchCartChanges(CART_KEY, onClear);

    fireStorageEvent(CART_KEY, null);

    expect(onClear).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('calls onClear when cart has empty items array', () => {
    const onClear = vi.fn();
    const cleanup = watchCartChanges(CART_KEY, onClear);

    fireStorageEvent(CART_KEY, JSON.stringify({ state: { items: [] } }));

    expect(onClear).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('calls onChange when cart has items', () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    const cleanup = watchCartChanges(CART_KEY, onClear, onChange);

    const cartValue = JSON.stringify({
      state: { items: [{ id: 'donut-1', quantity: 1 }] },
    });
    fireStorageEvent(CART_KEY, cartValue);

    expect(onClear).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(cartValue);
    cleanup();
  });

  it('ignores storage events for different keys', () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    const cleanup = watchCartChanges(CART_KEY, onClear, onChange);

    fireStorageEvent('some-other-key', null);

    expect(onClear).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    cleanup();
  });

  it('ignores malformed JSON silently', () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    const cleanup = watchCartChanges(CART_KEY, onClear, onChange);

    // Invalid JSON — should not throw or call callbacks
    fireStorageEvent(CART_KEY, 'not-valid-json{{{');

    expect(onClear).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    cleanup();
  });

  it('calls onClear when parsed state has no items property', () => {
    const onClear = vi.fn();
    const cleanup = watchCartChanges(CART_KEY, onClear);

    // Valid JSON but no state.items — defaults to [] via ?? []
    fireStorageEvent(CART_KEY, JSON.stringify({ state: {} }));

    expect(onClear).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('does not call onChange if not provided', () => {
    const onClear = vi.fn();
    // onChange not passed
    const cleanup = watchCartChanges(CART_KEY, onClear);

    fireStorageEvent(
      CART_KEY,
      JSON.stringify({ state: { items: [{ id: 'd1', quantity: 1 }] } }),
    );

    // Should not throw, just skip calling onChange
    expect(onClear).not.toHaveBeenCalled();
    cleanup();
  });
});
