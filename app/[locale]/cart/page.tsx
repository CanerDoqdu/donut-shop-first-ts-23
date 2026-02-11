'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const t = useTranslations();
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.18; // 18% VAT in Turkey
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-24 w-24 text-gray-300 mb-6" />
        <h2 className="font-fredoka text-3xl font-bold mb-4">{t('cart.empty')}</h2>
        <p className="text-gray-600 mb-8">Add some delicious donuts to get started!</p>
        <Button asChild size="lg">
          <Link href="/products">{t('cart.continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-fredoka text-4xl font-bold mb-8 bg-gradient-donut bg-clip-text text-transparent">
        {t('cart.title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.product.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 relative shrink-0 mx-auto sm:mx-0">
                    <Image
                      src={item.product.image_url?.startsWith('/') || item.product.image_url?.startsWith('http') ? item.product.image_url : '/donut.png'}
                      alt={item.product.name_en}
                      fill
                      className="object-contain"
                    />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left w-full">
                    <CardTitle className="mb-1 sm:mb-2 text-base sm:text-lg">{item.product.name_en}</CardTitle>
                    <p className="text-gray-600 text-sm hidden sm:block">{item.product.description_en}</p>
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
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.product.name_en}`}
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.product.id, parseInt(e.target.value) || 0)
                        }
                        className="w-12 sm:w-16 text-center h-8 sm:h-10 text-sm"
                        min="0"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.product.name_en}`}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.product.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 sm:h-10"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('cart.remove')}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between">
            <Button asChild variant="outline">
              <Link href="/products">{t('cart.continueShopping')}</Link>
            </Button>
            <Button variant="ghost" onClick={clearCart} className="text-red-500">
              Clear Cart
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
