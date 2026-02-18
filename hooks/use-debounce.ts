import { useState, useEffect } from 'react';

/**
 * Debounces a rapidly-changing value.
 *
 * Usage:
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *   // filter / fetch with debouncedQuery instead of query
 *
 * @param value  The value to debounce
 * @param delay  Delay in ms (default 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
