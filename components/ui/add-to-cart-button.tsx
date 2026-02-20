'use client';

import { memo } from 'react';
import { useAddToCart } from '@/hooks';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check } from 'lucide-react';
import type { Product } from '@/lib/types';

interface AddToCartButtonProps {
  product: Product;
  label: string;
  outOfStockLabel: string;
  className?: string;
}

/**
 * Cart add button with optimistic feedback.
 * Shows a brief "Added!" confirmation after clicking.
 * Memoised — only re-renders when its own props change.
 */
export const AddToCartButton = memo(function AddToCartButton({ product, label, outOfStockLabel, className }: AddToCartButtonProps) {
  const { justAdded, addToCart } = useAddToCart();
  const disabled = product.stock === 0;

  return (
    <Button
      className={`w-full transition-all duration-300 ${justAdded ? 'bg-green-500 hover:bg-green-600' : ''} ${className ?? ''}`}
      onClick={() => addToCart(product)}
      disabled={disabled}
    >
      {justAdded ? (
        <>
          <Check className="mr-2 h-4 w-4 animate-in zoom-in duration-200" />
          Added!
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {disabled ? outOfStockLabel : label}
        </>
      )}
    </Button>
  );
});
