/**
 * Centralised cache-tag registry.
 *
 * Every `unstable_cache` / `revalidateTag` call MUST reference a tag
 * from this file so we have a single source of truth for invalidation.
 *
 * ── Naming convention ───────────────────────────────────────────
 *   collection    → "products"        (revalidates ALL products)
 *   entity        → "product:chocolate-dream" (single product by slug)
 *   scope         → "orders:user:<id>"  (user-scoped collection)
 *   dashboard     → "admin:dashboard"   (aggregate view)
 *
 * ── Invalidation triggers ───────────────────────────────────────
 *   Tag                        Trigger
 *   ──────────────────────     ──────────────────────────────
 *   products                   Admin creates/updates/deletes a product
 *   product:<slug>             Single product edit
 *   orders                     Any order status change / webhook
 *   orders:user:<id>           User's order created/updated
 *   admin:dashboard            Order paid/cancelled, product stock change
 *   stores                     Store added/updated/deactivated
 */

// ── Collection tags ──────────────────────────────────────────

export const TAG_PRODUCTS = 'products' as const;
export const TAG_ORDERS = 'orders' as const;
export const TAG_STORES = 'stores' as const;
export const TAG_ADMIN_DASHBOARD = 'admin:dashboard' as const;

// ── Entity tag builders ──────────────────────────────────────

export function productTag(slug: string) {
  return `product:${slug}` as const;
}

export function userOrdersTag(userId: string) {
  return `orders:user:${userId}` as const;
}

export function orderTag(orderId: string) {
  return `order:${orderId}` as const;
}

// ── Revalidation durations (seconds) ─────────────────────────
//
// These are the `revalidate` values passed to `unstable_cache`.
// They act as a MAXIMUM time before the cache is refreshed,
// but `revalidateTag(tag)` can force earlier invalidation.

/** Products change rarely — 5 min default, tag-invalidated on edit. */
export const PRODUCTS_REVALIDATE_S = 300;

/** Stores change very rarely — 10 min default. */
export const STORES_REVALIDATE_S = 600;

/** Orders are user-scoped and change frequently — 60 s max. */
export const ORDERS_REVALIDATE_S = 60;

/** Admin dashboard aggregates — 2 min max, tag-invalidated on order change. */
export const ADMIN_DASHBOARD_REVALIDATE_S = 120;
