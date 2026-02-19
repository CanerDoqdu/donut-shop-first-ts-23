-- =============================================
-- 007: Audit log append-only enforcement
-- Depends on: 005_soft_delete_audit
-- Idempotent: safe to re-run at any time
-- =============================================
BEGIN;

-- ─── 1. Trigger function that blocks mutation ───────────────

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — UPDATE and DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Block UPDATE ────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

-- ─── 3. Block DELETE ────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

-- ─── 4. Restrict RLS: no UPDATE/DELETE policies ─────────────
-- (005 already only grants SELECT to admins.
--  INSERT is service_role only, no anon/auth policy needed.)

-- Explicitly deny UPDATE/DELETE for all roles except superuser:
DROP POLICY IF EXISTS "No one can update audit log" ON audit_log;
CREATE POLICY "No one can update audit log"
  ON audit_log FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No one can delete audit log" ON audit_log;
CREATE POLICY "No one can delete audit log"
  ON audit_log FOR DELETE
  USING (false);

COMMIT;
