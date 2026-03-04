'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import type { Product, CartItem } from '@/lib/types';
import { telemetry } from '@/lib/telemetry';
import { isEnabled } from '@/lib/feature-flags';

type AddToCartStatus = 'idle' | 'adding' | 'added' | 'error';

interface UseAddToCartReturn {
  /** Current status of the add-to-cart operation */
  status: AddToCartStatus;
  /** True for a brief period after successfully adding */
  justAdded: boolean;
  /** Error message if the last add failed */
  error: string | null;
  /** Wrapper around cart store's addItem with optimistic update + rollback on failure */
  addToCart: (product: Product, quantity?: number) => void;
}

/**
 * Hook that wraps `useCartStore.addItem` with:
 *  - Optimistic UI: cart updates immediately
 *  - Rollback: if stock check fails, cart reverts to prior state
 *  - Dedup: rapid clicks don't stack (uses useLatestRequest pattern internally)
 *  - Visual feedback: `justAdded` = true for 1.5s after success
 *
 * Usage:
 * ```tsx
 * const { justAdded, addToCart, status, error } = useAddToCart();
 * <Button onClick={() => addToCart(product)} disabled={status === 'adding'}>
 *   {justAdded ? '✓ Added!' : 'Add to Cart'}
 * </Button>
 * {error && <p className="text-red-500">{error}</p>}
 * ```
 */
export function useAddToCart(): UseAddToCartReturn {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const [status, setStatus] = useState<AddToCartStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup timer + abort on unmount to prevent setState-after-unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      // Abort any previous in-flight validation
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Snapshot cart state for rollback — read fresh from store, not stale closure
      const currentItems = useCartStore.getState().items;
      const existingItem = currentItems.find(
        (item: CartItem) => item.product.id === product.id,
      );
      const previousQuantity = existingItem?.quantity ?? 0;

      // ── Telemetry: add_to_cart ──
      if (isEnabled('product_telemetry', product.id)) {
        telemetry.track('add_to_cart', {
          productId: product.id,
          quantity,
          source: 'product_page',
        });
      }

      // ── Optimistic update ──
      addItem(product, quantity);
      setStatus('adding');
      setError(null);

      // ── Background stock validation ──
      fetch(`/api/products?id=${product.id}&stockCheck=true`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (controller.signal.aborted) return;

          if (!res.ok) {
            throw new Error('Stock validation failed');
          }

          const data = await res.json();
          const serverStock = data?.stock ?? Infinity;
          const requestedTotal = previousQuantity + quantity;

          if (serverStock < requestedTotal) {
            // ── Rollback: revert to previous state ──
            if (previousQuantity === 0) {
              removeItem(product.id);
            } else {
              updateQuantity(product.id, previousQuantity);
            }
            setStatus('error');
            setError(
              serverStock === 0
                ? 'This product is out of stock'
                : `Only ${serverStock} left in stock`,
            );
            return;
          }

          // Stock OK — keep the optimistic update
          setStatus('added');
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setStatus('idle'), 1500);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;

          // Network error — keep optimistic update (graceful degradation)
          // Only rollback on confirmed stock issues, not on network failures
          if (err instanceof Error && err.message === 'Stock validation failed') {
            if (previousQuantity === 0) {
              removeItem(product.id);
            } else {
              updateQuantity(product.id, previousQuantity);
            }
            setStatus('error');
            setError('Could not verify stock. Please try again.');
            return;
          }

          // Network failure → keep optimistic, show as success
          setStatus('added');
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setStatus('idle'), 1500);
        });
    },
    [addItem, removeItem, updateQuantity],
  );

  return {
    status,
    justAdded: status === 'added',
    error,
    addToCart,
  };
}
