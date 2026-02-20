'use client';

import { useState, useCallback, useRef } from 'react';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/lib/types';

interface UseAddToCartReturn {
  /** True for a brief period after successfully adding */
  justAdded: boolean;
  /** Wrapper around cart store's addItem with optimistic feedback */
  addToCart: (product: Product, quantity?: number) => void;
}

/**
 * Hook that wraps `useCartStore.addItem` with instant visual feedback.
 *
 * After calling `addToCart`, `justAdded` becomes `true` for 1.5 s,
 * allowing the button to show a "Added!" confirmation state.
 *
 * Usage:
 * ```tsx
 * const { justAdded, addToCart } = useAddToCart();
 * <Button onClick={() => addToCart(product)}>
 *   {justAdded ? '✓ Added!' : 'Add to Cart'}
 * </Button>
 * ```
 */
export function useAddToCart(): UseAddToCartReturn {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      // Immediate store update (already synchronous)
      addItem(product, quantity);

      // Visual feedback
      setJustAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustAdded(false), 1500);
    },
    [addItem]
  );

  return { justAdded, addToCart };
}
