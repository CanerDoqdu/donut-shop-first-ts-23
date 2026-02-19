-- =============================================
-- PR4: Webhook Hardening — Stripe Events + Transaction RPC
-- Run this in the Supabase SQL Editor after schema.sql
-- =============================================

-- ─── Idempotency table: prevents duplicate event processing ───
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type);

-- RLS: only service_role can access (webhooks use admin client)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- ─── Transactional RPC: atomically update order + award loyalty ───
-- Called from the webhook handler on checkout.session.completed.
-- Runs inside a single Postgres transaction so order status and
-- loyalty points are always consistent.
CREATE OR REPLACE FUNCTION process_payment_completed(
  p_stripe_session_id TEXT,
  p_payment_intent_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with table-owner privileges
SET search_path = public  -- prevent search_path injection
AS $$
DECLARE
  v_order RECORD;
  v_points INTEGER := 0;
BEGIN
  -- 1. Atomically mark order as paid (only if still pending)
  UPDATE orders
  SET status              = 'paid',
      stripe_payment_intent_id = p_payment_intent_id,
      updated_at          = NOW()
  WHERE stripe_session_id = p_stripe_session_id
    AND status            = 'pending'
  RETURNING id, user_id, total INTO v_order;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'order_not_found_or_already_processed'
    );
  END IF;

  -- 2. Award loyalty points (1 pt per 10 TRY) — only if tables exist
  IF v_order.user_id IS NOT NULL
     AND v_order.total > 0
     AND EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'loyalty_points'
     )
  THEN
    v_points := FLOOR(v_order.total / 10);

    IF v_points > 0 THEN
      -- Upsert loyalty record
      INSERT INTO loyalty_points (user_id, total_points, lifetime_points)
      VALUES (v_order.user_id, v_points, v_points)
      ON CONFLICT (user_id) DO UPDATE
      SET total_points    = loyalty_points.total_points    + EXCLUDED.total_points,
          lifetime_points = loyalty_points.lifetime_points + EXCLUDED.lifetime_points,
          updated_at      = NOW();

      -- Record points transaction
      INSERT INTO points_transactions (user_id, order_id, type, points, description)
      VALUES (
        v_order.user_id,
        v_order.id,
        'earned',
        v_points,
        'Order payment completed'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'order_id',       v_order.id,
    'points_awarded', v_points
  );
END;
$$;
