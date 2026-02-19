import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  TAG_PRODUCTS,
  TAG_ORDERS,
  TAG_ADMIN_DASHBOARD,
  productTag,
  userOrdersTag,
  orderTag,
  PRODUCTS_REVALIDATE_S,
  ORDERS_REVALIDATE_S,
  ADMIN_DASHBOARD_REVALIDATE_S,
} from '@/lib/cache-tags';

/**
 * Server-side cached query helpers.
 *
 * Two layers of caching:
 *  1. `React.cache()` — deduplicates identical calls within a single
 *     server render pass (same request).
 *  2. `unstable_cache()` — cross-request data cache with tag-based
 *     invalidation via `revalidateTag()`.
 *
 * Call `revalidateTag('products')` after a product mutation to
 * bust the cache without redeploying.
 */

// ─── Products ────────────────────────────────────────────────

export const getProducts = cache(
  unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    ['products-all'],
    { revalidate: PRODUCTS_REVALIDATE_S, tags: [TAG_PRODUCTS] },
  ),
);

export const getFeaturedProducts = cache(
  unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('featured', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    ['products-featured'],
    { revalidate: PRODUCTS_REVALIDATE_S, tags: [TAG_PRODUCTS] },
  ),
);

export const getProductBySlug = cache(async (slug: string) => {
  const fn = unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    [`product-${slug}`],
    { revalidate: PRODUCTS_REVALIDATE_S, tags: [TAG_PRODUCTS, productTag(slug)] },
  );
  return fn();
});

// ─── Orders ──────────────────────────────────────────────────

export const getOrdersByUser = cache(async (userId: string) => {
  const fn = unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', userId)
        .is('deleted_at', null)          // respect soft-delete
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    [`orders-user-${userId}`],
    { revalidate: ORDERS_REVALIDATE_S, tags: [TAG_ORDERS, userOrdersTag(userId)] },
  );
  return fn();
});

export const getOrderById = cache(async (orderId: string) => {
  const fn = unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    [`order-${orderId}`],
    { revalidate: ORDERS_REVALIDATE_S, tags: [TAG_ORDERS, orderTag(orderId)] },
  );
  return fn();
});

// ─── Admin: dashboard aggregate ──────────────────────────────

export interface DashboardAggregates {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
  ordersToday: number;
  revenueToday: number;
}

/**
 * Fetch all admin dashboard numbers in a single batched request
 * instead of N+1 individual queries.
 */
export const getAdminDashboardData = cache(
  unstable_cache(
    async () => {
      const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Run all queries in parallel
  const [
    ordersResult,
    todayOrdersResult,
    customersResult,
    pendingResult,
    lowStockResult,
    orderItemsResult,
  ] = await Promise.all([
    supabase.from('orders').select('id, total_amount, status, created_at').is('deleted_at', null),
    supabase.from('orders').select('id, total_amount').is('deleted_at', null).gte('created_at', todayISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock', 10),
    supabase.from('order_items').select('product_name, quantity, unit_price'),
  ]);

  const allOrders = ordersResult.data ?? [];
  const todayOrders = todayOrdersResult.data ?? [];
  const totalRevenue = allOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const revenueToday = todayOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  // Aggregate top products from order_items
  const productStats: Record<string, { sold: number; revenue: number }> = {};
  for (const item of orderItemsResult.data ?? []) {
    const name = item.product_name as string;
    const qty = Number(item.quantity);
    const price = Number(item.unit_price);
    if (!productStats[name]) productStats[name] = { sold: 0, revenue: 0 };
    productStats[name].sold += qty;
    productStats[name].revenue += qty * price;
  }

  const topProducts = Object.entries(productStats)
    .map(([product_name, d]) => ({ product_name, total_sold: d.sold, revenue: d.revenue }))
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 5);

  const recentOrders = [...allOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    stats: {
      totalOrders: allOrders.length,
      totalRevenue,
      totalCustomers: customersResult.count ?? 0,
      pendingOrders: pendingResult.count ?? 0,
      lowStockProducts: lowStockResult.count ?? 0,
      ordersToday: todayOrders.length,
      revenueToday,
    } satisfies DashboardAggregates,
    recentOrders,
    topProducts,
  };
    },
    ['admin-dashboard'],
    { revalidate: ADMIN_DASHBOARD_REVALIDATE_S, tags: [TAG_ADMIN_DASHBOARD, TAG_ORDERS] },
  ),
);
