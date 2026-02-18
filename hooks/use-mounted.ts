import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns `true` after initial client-side mount.
 * Uses `useSyncExternalStore` to avoid setState-in-effect
 * and guarantee a single synchronous commit after hydration.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // client snapshot
    () => false,  // server snapshot
  );
}
