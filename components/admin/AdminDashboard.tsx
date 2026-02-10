'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { 
  TrendingUp, Users, Package, DollarSign, 
  ShoppingCart, Clock, ArrowUp, ArrowDown, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface AdminDashboardProps {
  locale: 'tr' | 'en';
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  avgOrderValue: number;
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  lowStockProducts: number;
}

interface RecentOrder {
  id: string;
  user_email: string;
  total: number;
  status: string;
  created_at: string;
}

interface TopProduct {
  product_name: string;
  total_sold: number;
  revenue: number;
}

export default function AdminDashboard({ locale }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const supabase = createClient();

  const t = {
    tr: {
      dashboard: 'Yönetim Paneli',
      totalOrders: 'Toplam Sipariş',
      totalRevenue: 'Toplam Gelir',
      totalCustomers: 'Toplam Müşteri',
      avgOrderValue: 'Ort. Sipariş Değeri',
      ordersToday: 'Bugünkü Siparişler',
      revenueToday: 'Bugünkü Gelir',
      pendingOrders: 'Bekleyen Siparişler',
      lowStock: 'Düşük Stok',
      recentOrders: 'Son Siparişler',
      topProducts: 'En Çok Satan Ürünler',
      viewAll: 'Tümünü Gör',
      today: 'Bugün',
      thisWeek: 'Bu Hafta',
      thisMonth: 'Bu Ay',
      status: 'Durum',
      customer: 'Müşteri',
      amount: 'Tutar',
      date: 'Tarih',
      product: 'Ürün',
      sold: 'Satış',
      revenue: 'Gelir',
      pending: 'Beklemede',
      paid: 'Ödendi',
      preparing: 'Hazırlanıyor',
      shipped: 'Kargoda',
      delivered: 'Teslim Edildi',
      vsLastWeek: 'geçen haftaya göre',
      items: 'ürün',
    },
    en: {
      dashboard: 'Admin Dashboard',
      totalOrders: 'Total Orders',
      totalRevenue: 'Total Revenue',
      totalCustomers: 'Total Customers',
      avgOrderValue: 'Avg. Order Value',
      ordersToday: 'Orders Today',
      revenueToday: 'Revenue Today',
      pendingOrders: 'Pending Orders',
      lowStock: 'Low Stock',
      recentOrders: 'Recent Orders',
      topProducts: 'Top Selling Products',
      viewAll: 'View All',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      status: 'Status',
      customer: 'Customer',
      amount: 'Amount',
      date: 'Date',
      product: 'Product',
      sold: 'Sold',
      revenue: 'Revenue',
      pending: 'Pending',
      paid: 'Paid',
      preparing: 'Preparing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      vsLastWeek: 'vs last week',
      items: 'items',
    },
  }[locale];

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Fetch orders
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, user_email, total, status, created_at');

    // Fetch today's orders
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id, total')
      .gte('created_at', todayISO);

    // Fetch unique customers
    const { data: customers } = await supabase
      .from('profiles')
      .select('id');

    // Fetch pending orders
    const { data: pending } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending');

    // Fetch low stock products
    const { data: lowStock } = await supabase
      .from('products')
      .select('id')
      .lt('stock', 10);

    // Fetch order items for top products
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_name, quantity, unit_price');

    // Calculate stats
    const totalRevenue = allOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
    const revenueToday = todayOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
    
    setStats({
      totalOrders: allOrders?.length || 0,
      totalRevenue,
      totalCustomers: customers?.length || 0,
      avgOrderValue: allOrders?.length ? totalRevenue / allOrders.length : 0,
      ordersToday: todayOrders?.length || 0,
      revenueToday,
      pendingOrders: pending?.length || 0,
      lowStockProducts: lowStock?.length || 0,
    });

    // Recent orders
    setRecentOrders(
      (allOrders || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    );

    // Calculate top products
    const productStats: Record<string, { sold: number; revenue: number }> = {};
    orderItems?.forEach((item) => {
      if (!productStats[item.product_name]) {
        productStats[item.product_name] = { sold: 0, revenue: 0 };
      }
      productStats[item.product_name].sold += item.quantity;
      productStats[item.product_name].revenue += item.quantity * item.unit_price;
    });

    setTopProducts(
      Object.entries(productStats)
        .map(([name, data]) => ({
          product_name: name,
          total_sold: data.sold,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5)
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    startTransition(() => {
      void fetchDashboardData();
    });
  }, [fetchDashboardData, timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'paid': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-purple-100 text-purple-700';
      case 'shipped': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t.pending,
      paid: t.paid,
      preparing: t.preparing,
      shipped: t.shipped,
      delivered: t.delivered,
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-80 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t.dashboard}</h1>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === 'today' ? t.today : range === 'week' ? t.thisWeek : t.thisMonth}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t.totalOrders, value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'blue', trend: 12 },
          { label: t.totalRevenue, value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'green', trend: 8 },
          { label: t.totalCustomers, value: stats?.totalCustomers || 0, icon: Users, color: 'purple', trend: 5 },
          { label: t.avgOrderValue, value: formatCurrency(stats?.avgOrderValue || 0), icon: TrendingUp, color: 'amber', trend: -2 },
        ].map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            amber: 'bg-amber-500',
          };
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${colorClasses[stat.color]} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {Math.abs(stat.trend)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-4">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{stats?.ordersToday || 0}</span>
          </div>
          <p className="text-sm text-blue-700 mt-2">{t.ordersToday}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{formatCurrency(stats?.revenueToday || 0)}</span>
          </div>
          <p className="text-sm text-green-700 mt-2">{t.revenueToday}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">{t.pendingOrders}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between">
            <Package className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-red-600">{stats?.lowStockProducts || 0}</span>
          </div>
          <p className="text-sm text-red-700 mt-2">{t.lowStock}</p>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">{t.recentOrders}</h2>
            <button className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              {t.viewAll}
              <Eye className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-800">{order.user_email}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{formatCurrency(order.total)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">{t.topProducts}</h2>
            <button className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              {t.viewAll}
              <Eye className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map((product, index) => (
              <div key={product.product_name} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{product.product_name}</p>
                    <p className="text-xs text-gray-500">{product.total_sold} {t.sold}</p>
                  </div>
                </div>
                <p className="font-semibold text-gray-800">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
