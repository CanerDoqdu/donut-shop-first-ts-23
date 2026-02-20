-- ============================================================
-- Migration 012: Audit log table for GDPR and admin actions
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  action      TEXT NOT NULL,        -- 'gdpr_delete', 'gdpr_export', 'admin_action', etc.
  details     JSONB DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user history lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON audit_log (user_id, created_at DESC);

-- Index for action filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (action, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
CREATE POLICY "admin_read_audit_log" ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Service role can insert (via API)
-- No user-facing insert policy needed
