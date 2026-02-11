'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Package,
  CreditCard,
  ChefHat,
  Truck,
  CheckCircle2,
  MapPin,
  Calendar,
} from 'lucide-react';

// Sample order data (will be fetched from Supabase in production)
const sampleOrder = {
  id: 'ORD-2024-001',
  status: 'preparing' as const,
  created_at: '2024-01-15T10:30:00Z',
  estimated_delivery: '2024-01-15T14:00:00Z',
  address: 'Bağdat Caddesi No:123, Kadıköy, İstanbul',
  customer_name: 'Caner',
  customer_email: 'caner@example.com',
  items: [
    { id: '1', name: 'Strawberry Glazed', price: 35, quantity: 2, image: '🍓' },
    { id: '2', name: 'Chocolate Dream', price: 40, quantity: 1, image: '🍫' },
    { id: '3', name: 'Classic Sugar', price: 25, quantity: 3, image: '🍩' },
  ],
  total_amount: 185,
};

const orderStatuses = ['pending', 'paid', 'preparing', 'shipped', 'delivered'] as const;

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Package className="w-5 h-5" />,
  paid: <CreditCard className="w-5 h-5" />,
  preparing: <ChefHat className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle2 className="w-5 h-5" />,
};

export default function OrderTrackingPage() {
  const t = useTranslations();
  const params = useParams();
  const orderId = params.id as string;

  const order = sampleOrder; // In production: fetch from Supabase by orderId
  const currentStatusIndex = orderStatuses.indexOf(order.status);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4">📦</div>
          <h1 className="text-2xl font-fredoka font-bold mb-2">{t('orders.noOrder')}</h1>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('nav.home')}
            </Link>
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
              {t('orders.trackOrder')}
            </h1>
            <p className="text-gray-500">
              {t('orders.orderNumber')}{orderId}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-linear-to-r from-pink-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-fredoka font-bold text-lg">
              {t('orders.timeline')}
            </h2>
          </div>
          <CardContent className="pt-8 pb-6">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-linear-to-r from-pink-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%` }}
                />
              </div>

              {/* Status Steps */}
              <div className="relative flex justify-between">
                {orderStatuses.map((status, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;

                  return (
                    <div key={status} className="flex flex-col items-center">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all
                          ${isCompleted
                            ? 'bg-linear-to-br from-pink-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-400'
                          }
                          ${isCurrent ? 'ring-4 ring-pink-200 scale-110' : ''}
                        `}
                      >
                        {statusIcons[status]}
                      </div>
                      <span
                        className={`mt-3 text-xs font-medium text-center ${
                          isCompleted ? 'text-pink-600' : 'text-gray-400'
                        }`}
                      >
                        {t(`orders.status.${status}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Delivery Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-fredoka font-bold">{t('orders.deliveryAddress')}</h3>
              </div>
              <p className="text-gray-600 text-sm">{order.address}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-fredoka font-bold">{t('orders.estimatedDelivery')}</h3>
              </div>
              <p className="text-gray-600 text-sm">
                {new Date(order.estimated_delivery).toLocaleString('tr-TR', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <div className="bg-linear-to-r from-orange-500 to-yellow-500 px-6 py-4">
            <h2 className="text-white font-fredoka font-bold text-lg">
              {t('orders.orderDetails')}
            </h2>
          </div>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{item.image}</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-fredoka font-bold text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-xl font-fredoka font-bold text-gray-900 pt-2">
                <span>{t('cart.total')}</span>
                <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-orange-500">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
