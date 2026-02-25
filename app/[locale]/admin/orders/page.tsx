'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Package,
  Clock,
  TrendingUp,
  DollarSign,
  ChevronDown,
  Eye,
  X,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  paid: 'bg-blue-100 text-blue-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const allStatuses: OrderStatus[] = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const supabaseRef = useRef(createClient());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      const supabase = supabaseRef.current;
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          status,
          total_amount,
          shipping_address,
          customer_email,
          customer_phone,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            unit_price
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch orders:', error);
      } else {
        setOrders((data as Order[]) || []);
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.customer_email || '').toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setSavingStatus(orderId);
    const supabase = supabaseRef.current;
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update order status:', error);
    } else {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    }
    setSavingStatus(null);
    setUpdatingId(null);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    inProgress: orders.filter((o) => ['paid', 'preparing', 'shipped'].includes(o.status)).length,
    revenue: orders
      .filter((o) => o.status !== 'pending' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_amount, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-fredoka font-bold text-gray-900">
            {t('admin.orders.title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('admin.orders.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">{t('admin.orders.totalOrders')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.pending}</p>
                  <p className="text-xs text-gray-500">{t('orders.status.pending')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-gray-500">{t('admin.orders.inProgress')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{formatPrice(stats.revenue)}</p>
                  <p className="text-xs text-gray-500">{t('admin.orders.revenue')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              className="pl-12"
              placeholder={t('admin.orders.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-linear-to-r from-pink-500 to-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('products.categories.all')}
            </button>
            {allStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-linear-to-r from-pink-500 to-orange-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t(`orders.status.${status}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-pink-100 to-orange-100 flex items-center justify-center">
                      <span className="text-xl">🍩</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-fredoka font-bold text-gray-900">{order.id.slice(0, 8)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {t(`orders.status.${order.status}`)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{order.customer_email || order.user_id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">
                      {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center gap-4">
                    <span className="font-fredoka font-bold text-lg text-gray-900">
                      {formatPrice(order.total_amount)}
                    </span>

                    {/* Status Update Dropdown */}
                    <div className="relative">
                      {updatingId === order.id ? (
                        <div className="absolute right-0 top-0 z-10 bg-white rounded-xl shadow-xl border p-2 min-w-40">
                          <div className="flex items-center justify-between mb-2 px-2">
                            <span className="text-xs font-medium text-gray-500">
                              {t('admin.orders.updateStatus')}
                            </span>
                            <button onClick={() => setUpdatingId(null)}>
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          {allStatuses.map((status) => (
                            <button
                              key={status}
                              disabled={savingStatus === order.id}
                              onClick={() => handleStatusUpdate(order.id, status)}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                order.status === status
                                  ? 'bg-pink-50 text-pink-600 font-medium'
                                  : 'hover:bg-gray-50 text-gray-700'
                              } ${savingStatus === order.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {savingStatus === order.id && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                              {t(`orders.status.${status}`)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUpdatingId(updatingId === order.id ? null : order.id)}
                      >
                        <ChevronDown className="w-4 h-4 mr-1" />
                        {t('admin.orders.updateStatus')}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('admin.orders.customerDetails')}
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedOrder?.id === order.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">{t('admin.orders.customerDetails')}</h4>
                        <p className="text-sm text-gray-900">{order.customer_email || '-'}</p>
                        {order.customer_phone && <p className="text-sm text-gray-600">{order.customer_phone}</p>}
                        <p className="text-sm text-gray-600 mt-1">{order.shipping_address || '-'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">{t('admin.orders.orderItems')}</h4>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900">{item.product_name}</span>
                                <span className="text-gray-400">x{item.quantity}</span>
                              </div>
                              <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-500">{t('admin.orders.noOrders')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
