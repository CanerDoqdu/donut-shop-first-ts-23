'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import {
  Package,
  ArrowLeft,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { SectionSuspense } from '@/components/ui/section-suspense';
import { OrderRow } from '@/components/ui/order-row';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export default function OrdersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('login_required');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          shipping_address,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            unit_price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch orders:', fetchError);
        setError('fetch_failed');
      } else {
        setOrders((data as Order[]) || []);
      }
      setLoading(false);
    }

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6BBF]" />
      </div>
    );
  }

  if (error === 'login_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-pink-50 to-orange-50">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-fredoka font-bold mb-2">
            {t('orders.loginRequired') || 'Giriş Yapmanız Gerekiyor'}
          </h1>
          <p className="text-gray-500 mb-6">
            {t('orders.loginMessage') || 'Siparişlerinizi görmek için giriş yapın.'}
          </p>
          <Button asChild>
            <Link href="/login">{t('auth.login') || 'Giriş Yap'}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error === 'fetch_failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-pink-50 to-orange-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h1 className="text-2xl font-fredoka font-bold mb-2">
            {t('orders.fetchError') || 'Could not load orders'}
          </h1>
          <p className="text-gray-500 mb-6">
            {t('orders.fetchErrorMessage') || 'Something went wrong. Please try again later.'}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t('common.retry') || 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label={t('common.back')}>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-fredoka font-bold text-gray-900">
              {t('orders.myOrders') || 'Siparişlerim'}
            </h1>
            <p className="text-gray-500">
              {t('orders.orderHistory') || 'Sipariş geçmişiniz'}
            </p>
          </div>
        </div>

        {/* Orders List */}
        <SectionSuspense name="OrderList">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-fredoka font-bold text-gray-700 mb-2">
                {t('orders.noOrders') || 'Henüz siparişiniz yok'}
              </h2>
              <p className="text-gray-500 mb-6">
                {t('orders.startShopping') || 'Harika donutlarımızı keşfedin!'}
              </p>
              <Button asChild>
                <Link href="/products">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {t('nav.products') || 'Ürünler'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                locale={locale}
                orderNumberLabel={t('orders.orderNumber') || 'Sipariş No'}
                totalLabel={t('cart.total') || 'Toplam'}
                trackLabel={t('orders.trackOrder') || 'Siparişi Takip Et'}
              />
            ))}
          </div>
        )}
        </SectionSuspense>
      </div>
    </div>
  );
}
