'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import {
  Package,
  ArrowLeft,
  CreditCard,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingBag,
  Loader2,
} from 'lucide-react';

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

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label_tr: string; label_en: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800', label_tr: 'Beklemede', label_en: 'Pending' },
  paid: { icon: <CreditCard className="w-4 h-4" />, color: 'bg-green-100 text-green-800', label_tr: 'Ödendi', label_en: 'Paid' },
  preparing: { icon: <ChefHat className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800', label_tr: 'Hazırlanıyor', label_en: 'Preparing' },
  shipped: { icon: <Truck className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800', label_tr: 'Yolda', label_en: 'Shipped' },
  delivered: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-800', label_tr: 'Teslim Edildi', label_en: 'Delivered' },
  cancelled: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-800', label_tr: 'İptal', label_en: 'Cancelled' },
};

export default function OrdersPage() {
  const t = useTranslations();
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

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
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
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const date = new Date(order.created_at);
              const formattedDate = date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Order Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">
                            {t('orders.orderNumber') || 'Sipariş No'}
                          </p>
                          <p className="font-mono text-sm font-bold">
                            {order.id.substring(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{formattedDate}</span>
                        <Badge className={`${status.color} flex items-center gap-1`}>
                          {status.icon}
                          {status.label_tr}
                        </Badge>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4">
                      <div className="space-y-2 mb-4">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">
                                {item.product_name} × {item.quantity}
                              </span>
                            </div>
                            <span className="font-medium">
                              {formatPrice(item.unit_price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Order Total */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="font-medium text-gray-700">
                          {t('cart.total') || 'Toplam'}
                        </span>
                        <span className="text-lg font-bold text-[#FF6BBF]">
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Track Order Button */}
                    <div className="px-4 pb-4">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/orders/${order.id}` as '/orders/success'}>
                          {t('orders.trackOrder') || 'Siparişi Takip Et'}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
