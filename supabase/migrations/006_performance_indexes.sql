-- =============================================
-- 006: Performance composite & partial indexes
-- Depends on: 001_core_schema, 002_extended_features, 005_soft_delete_audit
-- Idempotent: safe to re-run at any time
-- =============================================
BEGIN;

-- ─── 1. Orders: composite for user order listing ────────────
-- Covers: getOrdersByUser  → WHERE user_id = ? AND deleted_at IS NULL
-- ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_user_active_created
  ON orders (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ─── 2. Orders: status + date for admin pending filter ──────
-- Covers: admin dashboard pending count  → WHERE status = 'pending' AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_orders_pending_active
  ON orders (status)
  WHERE status = 'pending' AND deleted_at IS NULL;

-- ─── 3. Orders: created_at for today's revenue query ────────
-- Covers: admin dashboard  → WHERE deleted_at IS NULL AND created_at >= todayISO
CREATE INDEX IF NOT EXISTS idx_orders_active_created
  ON orders (created_at DESC)
  WHERE deleted_at IS NULL;

-- ─── 4. Products: featured + created_at for featured listing ─
-- Covers: getFeaturedProducts → WHERE featured = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_products_featured_created
  ON products (created_at DESC)
  WHERE featured = true;

-- ─── 5. Products: low-stock partial for dashboard ───────────
-- Covers: admin dashboard low-stock count → WHERE stock < 10
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (stock)
  WHERE stock < 10;

-- ─── 6. Order items: product aggregation for top-products ───
-- Covers: admin dashboard top products aggregation
CREATE INDEX IF NOT EXISTS idx_order_items_product_qty
  ON order_items (product_name, quantity, unit_price);

-- ─── 7. Stripe events: idempotency lookup ───────────────────
-- Covers: webhook handler → WHERE stripe_event_id = ?
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id
  ON stripe_events (stripe_event_id);

-- ─── 8. Analytics: time-range queries ───────────────────────
-- Covers: dashboard analytics by type + date range
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON analytics_events (event_type, created_at DESC);

-- ─── 9. Notifications: pending queue processing ─────────────
-- Covers: batch notification sender → WHERE status = 'pending'
CREATE INDEX IF NOT EXISTS idx_notifications_pending
  ON notifications (created_at)
  WHERE status = 'pending';

-- ─── 10. Reviews: approved product reviews listing ──────────
-- Covers: product detail page reviews → WHERE product_id = ? AND is_approved = true
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved
  ON reviews (product_id, created_at DESC)
  WHERE is_approved = true;

COMMIT;
