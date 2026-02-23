'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Safe one-shot timeout that auto-clears on unmount.
 *
 * Prevents setState-after-unmount errors from fire-and-forget
 * `setTimeout()` calls in event handlers (copy feedback,
 * save confirmation, add-to-cart flash, etc.).
 *
 * @returns `set(callback, delay)` to start a timeout, `clear()` to cancel.
 *
 * @example
 * ```tsx
 * const timeout = useTimeout();
 *
 * const handleCopy = () => {
 *   setCopied(true);
 *   timeout.set(() => setCopied(false), 2000);
 * };
 * ```
 */
export function useTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-clear on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const set = useCallback((callback: () => void, delay: number) => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      callback();
    }, delay);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  return { set, clear };
}
