import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query and returns whether it matches.
 * Uses `useSyncExternalStore` to avoid setState-in-effect.
 *
 * @param query  e.g. "(min-width: 768px)"
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
