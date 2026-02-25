'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import { CartItemRow } from '@/components/ui/cart-item-row';

// Stable subscription for Zustand persist hydration
const subscribeHydration = (onStoreChange: () => void) => {
  return useCartStore.persist.onFinishHydration(onStoreChange);
};
const getHydrated = () => useCartStore.persist.hasHydrated();
const getServerHydrated = () => false;

export default function CartPage() {
  const t = useTranslations();
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) => updateQuantity(productId, quantity),
    [updateQuantity],
  );
  const handleRemove = useCallback(
    (productId: string) => removeItem(productId),
    [removeItem],
  );

  if (!hydrated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex gap-4 animate-pulse">
                <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 space-y-4 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.18; // 18% VAT in Turkey
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-24 w-24 text-gray-300 mb-6" />
        <h2 className="font-fredoka text-3xl font-bold mb-4">{t('cart.empty')}</h2>
        <p className="text-gray-600 mb-8">{t('cart.emptyDescription')}</p>
        <Button asChild size="lg">
          <Link href="/products">{t('cart.continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1
        className="font-fredoka text-4xl font-bold mb-8 bg-gradient-donut bg-clip-text text-transparent animate-metallic-shine"
      >
        {t('cart.title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItemRow
              key={item.product.id}
              item={item}
              removeLabel={t('cart.remove')}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))}

          <div className="flex justify-between">
            <Button asChild variant="outline">
              <Link href="/products">{t('cart.continueShopping')}</Link>
            </Button>
            <Button variant="ghost" onClick={clearCart} className="text-red-500">
              {t('cart.clearCart')}
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <CardTitle className="mb-6">{t('checkout.orderSummary')}</CardTitle>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.tax')} (18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>{t('cart.total')}</span>
                  <span className="text-[#FF6BBF]">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-6 pt-0">
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">{t('cart.checkout')}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
