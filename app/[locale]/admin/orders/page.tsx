'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
} from 'lucide-react';

type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';

interface Order {
  id: string;
  customer: string;
  email: string;
  status: OrderStatus;
  items: { name: string; quantity: number; price: number; image: string }[];
  total: number;
  created_at: string;
  address: string;
}

// Sample orders data
const sampleOrders: Order[] = [
  {
    id: 'ORD-2024-001',
    customer: 'Caner Doğdu',
    email: 'caner@example.com',
    status: 'preparing',
    items: [
      { name: 'Strawberry Glazed', quantity: 2, price: 35, image: '🍓' },
      { name: 'Chocolate Dream', quantity: 1, price: 40, image: '🍫' },
    ],
    total: 110,
    created_at: '2024-01-15T10:30:00Z',
    address: 'Bağdat Caddesi No:123, Kadıköy, İstanbul',
  },
  {
    id: 'ORD-2024-002',
    customer: 'Ayşe Yılmaz',
    email: 'ayse@example.com',
    status: 'paid',
    items: [
      { name: 'Classic Sugar', quantity: 6, price: 25, image: '🍩' },
      { name: 'Vanilla Cream', quantity: 2, price: 38, image: '🍦' },
    ],
    total: 226,
    created_at: '2024-01-15T11:45:00Z',
    address: 'İstiklal Caddesi No:45, Beyoğlu, İstanbul',
  },
  {
    id: 'ORD-2024-003',
    customer: 'Mehmet Kaya',
    email: 'mehmet@example.com',
    status: 'delivered',
    items: [
      { name: 'Maple Bacon', quantity: 3, price: 45, image: '🥓' },
    ],
    total: 135,
    created_at: '2024-01-14T09:00:00Z',
    address: 'Atatürk Bulvarı No:78, Çankaya, Ankara',
  },
  {
    id: 'ORD-2024-004',
    customer: 'Elif Demir',
    email: 'elif@example.com',
    status: 'pending',
    items: [
      { name: 'Rainbow Sprinkles', quantity: 4, price: 35, image: '🌈' },
      { name: 'Caramel Delight', quantity: 2, price: 42, image: '🍮' },
    ],
    total: 224,
    created_at: '2024-01-15T14:20:00Z',
    address: 'Kordon Boyu No:12, Alsancak, İzmir',
  },
  {
    id: 'ORD-2024-005',
    customer: 'Ali Öztürk',
    email: 'ali@example.com',
    status: 'shipped',
    items: [
      { name: 'Pumpkin Spice', quantity: 2, price: 40, image: '🎃' },
    ],
    total: 80,
    created_at: '2024-01-15T08:15:00Z',
    address: 'Kızılay Meydanı No:5, Ankara',
  },
];

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  paid: 'bg-blue-100 text-blue-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
};

const allStatuses: OrderStatus[] = ['pending', 'paid', 'preparing', 'shipped', 'delivered'];

export default function AdminOrdersPage() {
  const t = useTranslations();
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    setUpdatingId(null);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    inProgress: orders.filter((o) => ['paid', 'preparing', 'shipped'].includes(o.status)).length,
    revenue: orders
      .filter((o) => o.status !== 'pending')
      .reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-fredoka font-bold text-gray-900">
            {t('admin.orders.title')}
          </h1>
          <p className="text-gray-500 mt-1">Track and manage customer orders</p>
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
                  <p className="text-xs text-gray-500">Total Orders</p>
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
                  <p className="text-xs text-gray-500">Pending</p>
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
                  <p className="text-xs text-gray-500">In Progress</p>
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
                  <p className="text-xs text-gray-500">Revenue</p>
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
              placeholder="Search by customer or order ID..."
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
              All
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
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-pink-100 to-orange-100 flex items-center justify-center">
                      <span className="text-xl">{order.items[0]?.image || '🍩'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-fredoka font-bold text-gray-900">{order.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                          {t(`orders.status.${order.status}`)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleString('tr-TR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="flex items-center gap-1">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-lg" title={`${item.name} x${item.quantity}`}>
                        {item.image}
                      </span>
                    ))}
                    <span className="text-xs text-gray-500 ml-1">
                      ({order.items.reduce((sum, i) => sum + i.quantity, 0)} items)
                    </span>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center gap-4">
                    <span className="font-fredoka font-bold text-lg text-gray-900">
                      {formatPrice(order.total)}
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
                              onClick={() => handleStatusUpdate(order.id, status)}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                order.status === status
                                  ? 'bg-pink-50 text-pink-600 font-medium'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
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
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Customer Details</h4>
                        <p className="text-sm text-gray-900">{order.customer}</p>
                        <p className="text-sm text-gray-600">{order.email}</p>
                        <p className="text-sm text-gray-600 mt-1">{order.address}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Order Items</h4>
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span>{item.image}</span>
                                <span className="text-gray-900">{item.name}</span>
                                <span className="text-gray-400">x{item.quantity}</span>
                              </div>
                              <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
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

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
