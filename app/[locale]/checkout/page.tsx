'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import Image from 'next/image';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { items, getTotalPrice } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
  });

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  // Redirect to cart if no items
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call checkout API to create Stripe session & save order to Supabase
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            id: i.product.id,
            name: i.product.name_en,
            price: i.product.price,
            quantity: i.quantity,
            image: i.product.image_url,
          })),
          customerEmail: formData.email,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-fredoka text-4xl font-bold mb-8 bg-gradient-donut bg-clip-text text-transparent">
        {t('checkout.title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Information Form */}
        <Card>
          <CardContent className="p-6">
            <CardTitle className="mb-6">{t('checkout.customerInfo')}</CardTitle>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.email')} *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.name')} *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.phone')} *
                </label>
                <Input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+90 555 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.address')} *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full delivery address"
                />
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  Siparişimi onaylayarak{' '}
                  <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">
                    Satış Sözleşmesi
                  </span>
                  ,{' '}
                  <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">
                    Gizlilik Politikası
                  </span>
                  {' '}ve{' '}
                  <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">
                    İade Koşulları
                  </span>
                  &apos;nı okuduğumu ve kabul ettiğimi onaylıyorum.
                </label>
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" disabled={loading || !termsAccepted}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  t('checkout.pay') + ' ' + formatPrice(total)
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <CardTitle className="mb-4">{t('checkout.orderSummary')}</CardTitle>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 relative shrink-0">
                      <Image
                        src={item.product.image_url?.startsWith('/') || item.product.image_url?.startsWith('http') ? item.product.image_url : '/donut.png'}
                        alt={item.product.name_en}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name_en}</p>
                      <p className="text-sm text-gray-600">
                        {t('cart.quantity')}: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.tax')} (18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>{t('cart.total')}</span>
                  <span className="text-[#FF6BBF]">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-[#FFF8E7] rounded-3xl p-6">
            <p className="text-sm text-gray-700">
              🔒 <strong>Secure Payment:</strong> Your payment information is encrypted and secure.
              We accept all major credit cards via Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
