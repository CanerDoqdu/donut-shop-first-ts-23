'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * useLatestRequest — abort-on-supersede request deduplication hook.
 *
 * Problem: User clicks "Add to Cart" 5× rapidly → 5 parallel POSTs.
 * Solution: Each new request aborts the previous one via AbortController.
 *
 * Also aborts the in-flight request on unmount (memory-leak prevention).
 *
 * Usage:
 * ```tsx
 * const { run, abort } = useLatestRequest();
 *
 * const handleClick = () => {
 *   run(async (signal) => {
 *     const res = await fetch('/api/cart', { signal });
 *     // only the latest click's response reaches here
 *   });
 * };
 * ```
 */

interface UseLatestRequestReturn {
  /** Run a new async task; any previous in-flight task is aborted. */
  run: (task: (signal: AbortSignal) => Promise<void>) => void;
  /** Manually abort the current in-flight request. */
  abort: () => void;
  /** Whether a request is currently in-flight. */
  isPending: boolean;
}

export function useLatestRequest(): UseLatestRequestReturn {
  const controllerRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);
  // Force re-render when pending changes to expose isPending
  // We track it in ref for performance but also need to expose it
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    pendingRef.current = false;
  }, []);

  const run = useCallback(
    (task: (signal: AbortSignal) => Promise<void>) => {
      // Abort previous in-flight request
      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;
      pendingRef.current = true;

      task(controller.signal)
        .catch(() => {
          // Swallow — consumer handles errors inside the task
        })
        .finally(() => {
          // Only clear if this controller is still the current one
          if (controllerRef.current === controller) {
            controllerRef.current = null;
            pendingRef.current = false;
          }
        });
    },
    [],
  );

  return {
    run,
    abort,
    get isPending() {
      return pendingRef.current;
    },
  };
}
