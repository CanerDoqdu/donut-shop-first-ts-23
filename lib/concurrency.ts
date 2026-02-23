// =============================================
// Concurrency Safety Utilities
// =============================================
// Patterns for preventing race conditions in checkout,
// cart sync, and concurrent API operations.
//
// Key patterns:
//   1. In-flight deduplication (client-side ref guard)
//   2. Idempotency key (server-side DB unique constraint)
//   3. Cross-tab cart sync via storage events
//   4. Stale-request rejection (generation counter)
// =============================================

/**
 * Creates an in-flight deduplication guard.
 *
 * If a function is called while a previous invocation is still pending,
 * the second call returns the same promise instead of starting a new one.
 *
 * This prevents:
 *  - Double-click creating 2 Stripe sessions
 *  - Network retry layer sending duplicate POST requests
 *  - React strict mode double-invoking effects
 *
 * @example
 * ```ts
 * const dedupedCheckout = createInflightGuard(checkout);
 * // These two calls share the same promise:
 * const p1 = dedupedCheckout(cart);
 * const p2 = dedupedCheckout(cart);
 * p1 === p2 // true
 * ```
 */
export function createInflightGuard<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  let inflight: Promise<TResult> | null = null;

  return (...args: TArgs): Promise<TResult> => {
    if (inflight) return inflight;

    inflight = fn(...args).finally(() => {
      inflight = null;
    });

    return inflight;
  };
}

/**
 * Stale request guard using a generation counter.
 *
 * When the cart is modified, the generation increments. Any in-flight
 * checkout request from an older generation is stale and should be ignored.
 *
 * This prevents:
 *  - Processing checkout responses for a cart that changed mid-request
 *  - Cross-tab cart wipe arriving after checkout started
 *
 * @example
 * ```ts
 * const guard = createStaleGuard();
 * const gen = guard.current();
 * await checkout(); // slow...
 * guard.bump(); // cart changed!
 * guard.isStale(gen); // true — discard result
 * ```
 */
export interface StaleGuard {
  /** Get the current generation number */
  current: () => number;
  /** Increment the generation (call on cart mutation) */
  bump: () => number;
  /** Check if a captured generation is now stale */
  isStale: (capturedGeneration: number) => boolean;
  /** Reset to 0 */
  reset: () => void;
}

export function createStaleGuard(): StaleGuard {
  let generation = 0;

  return {
    current: () => generation,
    bump: () => ++generation,
    isStale: (capturedGeneration: number) => capturedGeneration < generation,
    reset: () => { generation = 0; },
  };
}

/**
 * Simulate concurrent requests for testing.
 *
 * Fires N copies of the same async function simultaneously
 * and collects all results (settled).
 *
 * @param fn - The async function to call concurrently
 * @param count - Number of concurrent calls (default: 2)
 * @returns Array of settled results
 */
export async function simulateConcurrent<T>(
  fn: () => Promise<T>,
  count = 2,
): Promise<PromiseSettledResult<T>[]> {
  const promises = Array.from({ length: count }, () => fn());
  return Promise.allSettled(promises);
}

/**
 * Cross-tab cart change detector.
 *
 * Listens to storage events for the cart key and invokes the callback
 * when the cart is modified or cleared from another tab.
 *
 * @param cartKey - localStorage key for the cart
 * @param onClear - Called when cart is emptied externally
 * @param onChange - Called when cart is modified externally
 * @returns Cleanup function to remove the event listener
 */
export function watchCartChanges(
  cartKey: string,
  onClear: () => void,
  onChange?: (newValue: string) => void,
): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key !== cartKey) return;

    if (!e.newValue) {
      onClear();
      return;
    }

    try {
      const parsed = JSON.parse(e.newValue);
      const items = parsed?.state?.items ?? [];
      if (items.length === 0) {
        onClear();
        return;
      }
      if (onChange) {
        onChange(e.newValue);
      }
    } catch {
      // Parse error — ignore silently
    }
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
