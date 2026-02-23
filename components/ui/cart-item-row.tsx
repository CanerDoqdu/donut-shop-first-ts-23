'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/lib/types';

interface CartItemRowProps {
  item: CartItem;
  removeLabel: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/**
 * Memoised cart item row — only re-renders when this specific item changes.
 * Prevents the entire cart list from re-rendering when one item updates.
 */
export const CartItemRow = memo(function CartItemRow({
  item,
  removeLabel,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 relative shrink-0 mx-auto sm:mx-0">
            <Image
              src={
                item.product.image_url?.startsWith('/') ||
                item.product.image_url?.startsWith('http')
                  ? item.product.image_url
                  : '/donut.png'
              }
              alt={item.product.name_en}
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>

          <div className="flex-1 text-center sm:text-left w-full">
            <CardTitle className="mb-1 sm:mb-2 text-base sm:text-lg">
              {item.product.name_en}
            </CardTitle>
            <p className="text-gray-600 text-sm hidden sm:block">
              {item.product.description_en}
            </p>
            <p className="font-fredoka text-lg sm:text-xl font-bold text-[#FF6BBF] mt-1 sm:mt-2">
              {formatPrice(item.product.price)}
            </p>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                aria-label={`Decrease quantity of ${item.product.name_en}`}
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  onUpdateQuantity(item.product.id, parseInt(e.target.value) || 0)
                }
                className="w-12 sm:w-16 text-center h-8 sm:h-10 text-sm"
                min="0"
                aria-label={`Quantity of ${item.product.name_en}`}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                aria-label={`Increase quantity of ${item.product.name_en}`}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.product.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 sm:h-10"
              aria-label={`Remove ${item.product.name_en} from cart`}
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{removeLabel}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
