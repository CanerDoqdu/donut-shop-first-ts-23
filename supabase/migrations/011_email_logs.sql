-- Migration 011: Email delivery tracking
-- Logs every transactional email for audit, debugging and delivery status.

CREATE TABLE IF NOT EXISTS email_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_address  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  template    TEXT NOT NULL,            -- e.g. 'order_confirmation', 'password_reset'
  status      TEXT NOT NULL DEFAULT 'sent',  -- sent | delivered | bounced | failed
  resend_id   TEXT,                     -- Resend API message ID for tracking
  metadata    JSONB DEFAULT '{}'::JSONB, -- arbitrary data: orderId, locale, etc.
  error       TEXT,                     -- error message if failed
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent emails by status
CREATE INDEX IF NOT EXISTS idx_email_logs_status
  ON email_logs (status, sent_at DESC);

-- Index for looking up by recipient
CREATE INDEX IF NOT EXISTS idx_email_logs_to_address
  ON email_logs (to_address, sent_at DESC);

-- Index for looking up by Resend ID (for webhook status updates)
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id
  ON email_logs (resend_id)
  WHERE resend_id IS NOT NULL;

-- RLS: only admins can read email logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_logs_admin_read ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
