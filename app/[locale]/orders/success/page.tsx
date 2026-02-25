'use client';

import { useEffect, useState, useRef, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { useCartStore } from '@/store/cart-store';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, ArrowRight, Package, ExternalLink } from 'lucide-react';

export default function OrderSuccessPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const clearCart = useCartStore((state) => state.clearCart);
  const [sessionId, setSessionId] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const clearedRef = useRef(false);

  useEffect(() => {
    // Get session ID from URL params
    const id = searchParams.get('session_id') || searchParams.get('success') || '';
    startTransition(() => {
      setSessionId(id);
    });

    // Only clear cart if we have a valid session_id (not on bookmark/refresh without params)
    if (id && !clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }

    // Resolve the real order ID from the Stripe session ID
    if (id) {
      const supabase = createClient();
      supabase
        .from('orders')
        .select('id')
        .eq('stripe_session_id', id)
        .maybeSingle()
        .then(({ data }: { data: { id: string } | null }) => {
          if (data?.id) setOrderId(data.id);
        });
    }
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-emerald-50">
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>

        {/* Success Card */}
        <Card className="mb-8 border-green-200 shadow-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <CardTitle className="text-3xl mb-4 text-green-600">
              🎉 {t('orders.success') || 'Satın Alma Başarılı!'}
            </CardTitle>
            
            <p className="text-gray-600 mb-2 text-lg">
              {t('orders.thankYou') || 'Siparişiniz için teşekkür ederiz!'}
            </p>
            
            <p className="text-gray-500 mb-6">
              {t('orders.confirmationEmail') || 'Onay e-postası gönderdik. Siparişiniz hazırlanmaya başladı.'}
            </p>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <Package className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-gray-500 text-sm">{t('orders.orderNumber') || 'Sipariş No'}</p>
                  <p className="font-fredoka font-bold text-lg text-gray-900">
                    {orderId
                      ? orderId.substring(0, 8).toUpperCase()
                      : sessionId
                      ? sessionId.substring(0, 24) + '...'
                      : '—'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders.statusLabel') || 'Durum'}</span>
                  <span className="font-semibold text-green-600">✓ {t('orders.paid') || 'Ödendi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders.estimate') || 'Tahmini Teslim'}</span>
                  <span className="font-semibold text-gray-900">
                    {locale === 'tr' ? '20-30 dakika' : '20-30 minutes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
              <h3 className="font-bold text-gray-900 mb-3">📋 {t('orders.next') || 'Sonraki Adımlar'}</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li>✓ 1. {locale === 'tr' ? 'Ödeme işlendi' : 'Payment processed'}</li>
                <li>→ 2. {locale === 'tr' ? 'Sipariş hazırlanıyor' : 'Order being prepared'}</li>
                <li>→ 3. {locale === 'tr' ? 'Teslimat için yola çıkıyor' : 'Out for delivery'}</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderId && (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/orders/${orderId}` as any}>
                <ExternalLink className="mr-2 h-5 w-5" />
                {locale === 'tr' ? 'Siparişi Takip Et' : 'Track Your Order'}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/orders">
              <Package className="mr-2 h-5 w-5" />
              {t('orders.myOrders') || 'Siparişlerim'}
            </Link>
          </Button>
          <Button asChild size={orderId ? 'sm' : 'lg'} variant="ghost" className="w-full sm:w-auto">
            <Link href="/products">
              {t('cart.continueShopping') || 'Alışverişe Devam Et'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Contact Info */}
        <Card className="mt-12 bg-gray-50 border-gray-200">
          <CardContent className="p-6 text-center text-sm text-gray-600">
            <p className="mb-2">
              📞 {t('orders.question') || 'Sorunuz mu var?'} <strong>hello@glazedandsipped.com</strong>
            </p>
            <p>
              ⏱️ {t('orders.support') || 'Canlı Destek'}: 09:00 - 22:00
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
