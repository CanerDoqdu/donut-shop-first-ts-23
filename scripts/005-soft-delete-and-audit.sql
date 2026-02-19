-- =============================================
-- 005: Soft-delete for orders + audit_log table
-- Run in Supabase SQL Editor
-- =============================================

-- ─── 1. Soft-delete column on orders ────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN orders.deleted_at IS 'NULL = active, set = soft-deleted';

-- Index for fast "active only" queries
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at
  ON orders (deleted_at)
  WHERE deleted_at IS NULL;

-- Update RLS policy to exclude soft-deleted rows for normal users
-- (Admins can still see them through service_role)
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own active orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- Soft-delete helper function (instead of real DELETE)
CREATE OR REPLACE FUNCTION soft_delete_order(target_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = target_order_id
    AND deleted_at IS NULL;
END;
$$;

-- ─── 2. Audit log table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,          -- e.g. 'order.soft_delete', 'product.update', 'admin.login'
  entity_type TEXT NOT NULL,          -- e.g. 'order', 'product', 'profile'
  entity_id   TEXT NOT NULL,          -- PK of the affected row
  changes     JSONB DEFAULT '{}',     -- { field: { old, new } }
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying audit trail
CREATE INDEX IF NOT EXISTS idx_audit_log_actor    ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity   ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit_log (created_at);

-- RLS: only service_role can write; admins can read
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for anon/authenticated:
-- writes happen via service_role only.

-- ─── 3. Data retention: auto-purge old audit entries ────────

-- Scheduled via pg_cron or manual: DELETE audit entries older than 1 year
-- Example (requires pg_cron extension):
-- SELECT cron.schedule('purge-old-audit', '0 3 * * 0',
--   $$DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '1 year'$$
-- );
