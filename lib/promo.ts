/**
 * Promotional code validation and application logic.
 *
 * All promo validation runs through the `apply_promo_code` Postgres RPC,
 * which uses SELECT ... FOR UPDATE to prevent concurrent race conditions.
 *
 * Flow:
 *   1. validate-promo API → preview discount (no side effects)
 *   2. checkout API → atomically apply promo + create order
 *   3. On checkout failure → rollback promo via rollback_promo_code RPC
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────

export interface PromoResult {
  success: true;
  promoId: string;
  discountType: 'flat' | 'pct';
  discountValue: number;
  finalTotal: number;
}

export interface PromoError {
  success: false;
  reason: PromoErrorReason;
  message: string;
}

export type PromoErrorReason =
  | 'INVALID_CODE'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'DEPLETED'
  | 'MIN_ORDER_NOT_MET'
  | 'RPC_ERROR';

export type PromoOutcome = PromoResult | PromoError;

// ─── Human-readable error messages ──────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: 'Invalid promo code',
  INACTIVE: 'This promo code is no longer active',
  EXPIRED: 'This promo code has expired',
  DEPLETED: 'This promo code has been fully used',
  MIN_ORDER_NOT_MET: 'Order total does not meet the minimum requirement',
};

// ─── Preview (read-only) ────────────────────────────────────

/**
 * Preview a promo code's discount without applying it.
 * Reads from the promo_codes table but does NOT increment used_count.
 */
export async function previewPromo(
  admin: SupabaseClient,
  code: string,
  orderTotal: number,
): Promise<PromoOutcome> {
  const { data, error } = await admin
    .from('promo_codes')
    .select('*')
    .ilike('code', code)
    .single();

  if (error || !data) {
    return { success: false, reason: 'INVALID_CODE', message: ERROR_MESSAGES.INVALID_CODE };
  }

  if (!data.active) {
    return { success: false, reason: 'INACTIVE', message: ERROR_MESSAGES.INACTIVE };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { success: false, reason: 'EXPIRED', message: ERROR_MESSAGES.EXPIRED };
  }

  if (data.used_count >= data.max_uses) {
    return { success: false, reason: 'DEPLETED', message: ERROR_MESSAGES.DEPLETED };
  }

  if (orderTotal < data.min_order) {
    return { success: false, reason: 'MIN_ORDER_NOT_MET', message: ERROR_MESSAGES.MIN_ORDER_NOT_MET };
  }

  const discount =
    data.discount_type === 'pct'
      ? Math.round(orderTotal * (data.amount / 100) * 100) / 100
      : Math.min(data.amount, orderTotal);

  return {
    success: true,
    promoId: data.id,
    discountType: data.discount_type as 'flat' | 'pct',
    discountValue: discount,
    finalTotal: Math.max(orderTotal - discount, 0),
  };
}

// ─── Atomic Apply (inside transaction) ──────────────────────

/**
 * Atomically validate + apply a promo code.
 * Calls the `apply_promo_code` Postgres RPC which locks the row,
 * validates eligibility, and increments used_count in one statement.
 *
 * Only call this during actual checkout — NOT for preview.
 */
export async function applyPromo(
  admin: SupabaseClient,
  code: string,
  orderTotal: number,
): Promise<PromoOutcome> {
  const { data, error } = await admin.rpc('apply_promo_code', {
    p_code: code,
    p_order_total: orderTotal,
  });

  if (error) {
    return { success: false, reason: 'RPC_ERROR', message: error.message };
  }

  // RPC returns a single row (TABLE return type)
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || row.error_reason) {
    const reason = (row?.error_reason || 'INVALID_CODE') as PromoErrorReason;
    return {
      success: false,
      reason,
      message: ERROR_MESSAGES[reason] || 'Invalid promo code',
    };
  }

  return {
    success: true,
    promoId: row.promo_id,
    discountType: row.discount_type as 'flat' | 'pct',
    discountValue: Number(row.discount_value),
    finalTotal: Number(row.final_total),
  };
}

// ─── Rollback ───────────────────────────────────────────────

/**
 * Rollback a promo application (decrement used_count).
 * Called when checkout fails after promo was already applied.
 */
export async function rollbackPromo(
  admin: SupabaseClient,
  promoId: string,
): Promise<void> {
  await admin.rpc('rollback_promo_code', { p_promo_id: promoId });
}
