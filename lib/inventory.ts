/**
 * Inventory Locking & Stock Reservation helpers.
 *
 * All mutations go through Postgres functions that use row-level locking
 * (SELECT … FOR UPDATE inside the SQL function), making them safe under
 * concurrent requests.
 *
 * Flow:
 *  1. reserveStock()        – called at checkout start; decrements stock
 *  2. confirmReservations() – called by Stripe webhook on payment success
 *  3. releaseReservations() – called on payment failure / user cancellation
 *  4. cleanupExpired()      – should be scheduled (e.g. Supabase cron every 5 min)
 */

import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal: admin Supabase client (bypasses RLS – server-side only)
// ─────────────────────────────────────────────────────────────────────────────

function getAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase env vars for inventory module');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReservationItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface ReservationResult {
  success: boolean;
  /** productId of the first item that had insufficient stock, if any */
  insufficientStockFor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// reserveStock
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atomically reserves stock for all items in a checkout.
 *
 * Uses the `reserve_product_stock` Postgres function which does the
 * UPDATE … WHERE stock >= quantity check inside the DB, preventing races.
 *
 * If ANY item fails (out of stock), ALL previously reserved items in this
 * call are rolled back before returning.
 *
 * @param items      List of products / variants + quantities to reserve.
 * @param sessionId  Temp ID for this checkout attempt (becomes Stripe session ID later).
 */
export async function reserveStock(
  items: ReservationItem[],
  sessionId: string,
): Promise<ReservationResult> {
  const admin = getAdminClient();
  const reserved: ReservationItem[] = [];

  for (const item of items) {
    const { data: ok, error } = await admin.rpc('reserve_product_stock', {
      p_product_id: item.productId,
      p_variant_id: item.variantId ?? null,
      p_quantity:   item.quantity,
      p_session_id: sessionId,
    });

    if (error || !ok) {
      // Roll back everything reserved so far in this call
      if (reserved.length > 0) {
        await releaseReservations(sessionId).catch(() => {
          // Best-effort rollback: log but don't throw
          console.error('[inventory] partial rollback failed for session', sessionId);
        });
      }
      return { success: false, insufficientStockFor: item.productId };
    }

    reserved.push(item);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// releaseReservations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restores stock for all pending reservations associated with `sessionId`
 * and marks them as 'released'.
 *
 * Call this:
 *  - On Stripe payment failure
 *  - On checkout abandonment
 *  - When re-associating a temp session ID after receiving the real Stripe ID
 *    (pass the temp ID to release, Stripe will confirm via webhook)
 */
export async function releaseReservations(sessionId: string): Promise<void> {
  const admin = getAdminClient();

  const { error } = await admin.rpc('release_stock_reservations', {
    p_session_id: sessionId,
  });

  if (error) {
    throw new Error(`[inventory] releaseReservations failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmReservations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks all pending reservations for `sessionId` as 'confirmed' and
 * associates them with the completed `orderId`.
 *
 * Call this from the Stripe `checkout.session.completed` webhook handler.
 */
export async function confirmReservations(
  sessionId: string,
  orderId: string,
): Promise<void> {
  const admin = getAdminClient();

  const { error } = await admin.rpc('confirm_stock_reservations', {
    p_session_id: sessionId,
    p_order_id:   orderId,
  });

  if (error) {
    throw new Error(`[inventory] confirmReservations failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// cleanupExpired
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restores stock for all pending reservations whose TTL has elapsed.
 * Returns the number of reservations cleaned up.
 *
 * Schedule via Supabase pg_cron (every 5 minutes):
 *   SELECT cron.schedule('cleanup-reservations', '0,5,10,15,20,25,30,35,40,45,50,55 * * * *',
 *     'SELECT cleanup_expired_reservations()');
 *
 * Or call from an API route triggered by a Vercel cron job.
 */
export async function cleanupExpired(): Promise<number> {
  const admin = getAdminClient();

  const { data, error } = await admin.rpc('cleanup_expired_reservations');

  if (error) {
    throw new Error(`[inventory] cleanupExpired failed: ${error.message}`);
  }

  return (data as number) ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// getVariantsForProduct
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all active variants for a product (for use in the storefront UI).
 */
export async function getVariantsForProduct(productId: string) {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('active', true)
    .order('price_offset', { ascending: true });

  if (error) {
    throw new Error(`[inventory] getVariantsForProduct failed: ${error.message}`);
  }

  return data ?? [];
}
