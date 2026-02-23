'use client';

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { formatPrice } from '@/lib/utils';
import {
  Package,
  CreditCard,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
  order_items: OrderItem[];
}

const statusConfig: Record<
  string,
  { icon: React.ReactNode; color: string; label_tr: string; label_en: string }
> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800', label_tr: 'Beklemede', label_en: 'Pending' },
  paid: { icon: <CreditCard className="w-4 h-4" />, color: 'bg-green-100 text-green-800', label_tr: 'Ödendi', label_en: 'Paid' },
  preparing: { icon: <ChefHat className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800', label_tr: 'Hazırlanıyor', label_en: 'Preparing' },
  shipped: { icon: <Truck className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800', label_tr: 'Yolda', label_en: 'Shipped' },
  delivered: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-800', label_tr: 'Teslim Edildi', label_en: 'Delivered' },
  cancelled: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-800', label_tr: 'İptal', label_en: 'Cancelled' },
};

interface OrderRowProps {
  order: Order;
  orderNumberLabel: string;
  totalLabel: string;
  trackLabel: string;
}

/**
 * Memoised order row card — only re-renders when the specific order changes.
 */
export const OrderRow = memo(function OrderRow({
  order,
  orderNumberLabel,
  totalLabel,
  trackLabel,
}: OrderRowProps) {
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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Order Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">{orderNumberLabel}</p>
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
          <div className="space-y-2 mb-4" role="list" aria-label="Order items">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm" role="listitem">
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
            <span className="font-medium text-gray-700">{totalLabel}</span>
            <span className="text-lg font-bold text-[#FF6BBF]">
              {formatPrice(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Track Order Button */}
        <div className="px-4 pb-4">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/orders/${order.id}` as '/orders/success'}>
              {trackLabel}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
