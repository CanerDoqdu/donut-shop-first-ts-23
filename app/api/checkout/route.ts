import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getStripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getClientIP } from '@/lib/rate-limit';
import { redisRateLimit } from '@/lib/redis';
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from '@/lib/supabase/env';
import { getProductsByIds } from '@/lib/data.server';
import { CART_EXPIRY_MS } from '@/lib/constants';
import { checkoutSchema, parseBody } from '@/lib/validations';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { featureFlags } from '@/lib/config';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { logger, startTimer } from '@/lib/logger';
import { captureWithContext } from '@/lib/sentry';
import { reserveStock, releaseReservations } from '@/lib/inventory';
import { applyPromo, rollbackPromo } from '@/lib/promo';
import { dualWriteStripeSession } from '@/lib/migration';
import {
  E_RATE_LIMITED,
  E_VALIDATION_FAILED,
  E_CART_EXPIRED,
  E_PRODUCT_NOT_FOUND,
  E_DB_ORDER_CREATE_FAILED,
  E_DB_ORDER_ITEMS_FAILED,
  E_DB_PROFILE_UPSERT_FAILED,
  E_STRIPE_CHECKOUT_FAILED,
  E_OUT_OF_STOCK,
  E_PROMO_APPLY_FAILED,
  E_CHECKOUT_IDEMPOTENCY_CONFLICT,
} from '@/lib/error-codes';

// Helper: create admin-level client that bypasses RLS using service_role key.
// Uses @supabase/supabase-js createClient (NOT @supabase/ssr createServerClient)
// because service_role only fully bypasses RLS with the standard client.
function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createSupabaseClient(url, serviceRoleKey);
}

export const POST = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/checkout' });
  const elapsed = startTimer();

  // -- Maintenance mode --
  if (!featureFlags.checkoutEnabled) {
    throw new ApiError('MAINTENANCE', 'Checkout is temporarily disabled', 503);
  }

  // CSRF is now handled centrally by withHandler — no need to call validateOrigin here

  // Rate limit: 5 checkout attempts per minute per IP
  const ip = getClientIP(req);
  const limiter = await redisRateLimit(`checkout:${ip}`, { maxRequests: 5, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('checkout.rate_limited', { code: E_RATE_LIMITED, ip });
    log.count('checkout_rate_limited');
    throw new ApiError(
      E_RATE_LIMITED,
      'Too many requests. Please try again later.',
      429,
      { headers: { 'Retry-After': '60' } },
    );
  }

  try {
    const body = await req.json();

    // -- Zod validation --
    const parsed = parseBody(checkoutSchema, body);
    if (!parsed.success) {
      log.warn('checkout.validation_failed', { code: E_VALIDATION_FAILED, detail: parsed.error });
      throw new ApiError(E_VALIDATION_FAILED, parsed.error, 400);
    }

    const { items, customerEmail, customerName, customerPhone, customerAddress, locale, cartTimestamp, promoCode, idempotencyKey } = parsed.data;

    // Admin client (service_role) — created once and reused throughout the handler.
    const admin = createAdminClient();

    // -- Idempotency check: prevent duplicate orders from double-submit --
    if (idempotencyKey) {
      const { data: existingOrder, error: idemError } = await admin
        .from('orders')
        .select('id, stripe_session_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (idemError) {
        // Fail-open: log the issue (likely missing column — run migration 016) but don't block checkout.
        log.warn('checkout.idempotency_check_failed', { error: idemError.message });
      }

      if (existingOrder) {
        log.info('checkout.idempotency_hit', {
          code: E_CHECKOUT_IDEMPOTENCY_CONFLICT,
          idempotencyKey,
          existingOrderId: existingOrder.id,
        });

        if (existingOrder.stripe_session_id) {
          // Stripe session already created — attempt replay redirect.
          try {
            const existingSession = await getStripe().checkout.sessions.retrieve(
              existingOrder.stripe_session_id,
            );
            if (existingSession.url && existingSession.status === 'open') {
              log.info('checkout.idempotency_replay_redirect', { orderId: existingOrder.id });
              return NextResponse.json(
                { url: existingSession.url, orderId: existingOrder.id },
                { status: 200, headers: { 'X-Idempotent-Replay': 'true' } },
              );
            }
          } catch (stripeErr) {
            log.warn('checkout.idempotency_session_retrieve_failed', {
              orderId: existingOrder.id,
              error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
            });
          }
          // Session expired — cancel the stale order and proceed with fresh checkout.
          // Also null out idempotency_key so the unique index doesn't block the new INSERT.
          await admin
            .from('orders')
            .update({ status: 'cancelled', idempotency_key: null })
            .eq('id', existingOrder.id);
          log.info('checkout.idempotency_expired_session_cancelled', {
            orderId: existingOrder.id,
          });
          // Fall through to create a new order with fresh Stripe session
        } else {
          // No Stripe session — checkout failed before reaching Stripe.
          // Cancel the stale pending order so this request can proceed cleanly.
          // Also null out idempotency_key so the unique index doesn't block the new INSERT.
          await admin
            .from('orders')
            .update({ status: 'cancelled', idempotency_key: null })
            .eq('id', existingOrder.id);
          log.info('checkout.idempotency_cancelled_incomplete', { orderId: existingOrder.id });
          // Fall through — treat this as a fresh checkout.
        }
      }
    }

    // -- Server-side cart expiry check --
    if (cartTimestamp) {
      const age = Date.now() - cartTimestamp;
      if (age > CART_EXPIRY_MS) {
        log.info('checkout.cart_expired', { code: E_CART_EXPIRED });
        throw new ApiError(E_CART_EXPIRED, 'Cart expired. Please refresh and try again.', 410);
      }
    }

    // -- Server-truth pricing: look up real prices from DB (fallback: sample data) --
    const productIds = items.map((item) => item.id);
    const result = await getProductsByIds(productIds);
    const productMap = result.map;
    const dbIds = result.dbIds;

    // Validate every product exists server-side
    const serverItems = items.map((item) => {
      const product = productMap.get(item.id);
      if (!product) {
        throw new ApiError(E_PRODUCT_NOT_FOUND, `Product not found: ${item.id}`, 404);
      }
      return {
        id: product.id,
        name: product.name_en,
        price: product.price,
        quantity: item.quantity,
        image: product.image_url,
      };
    });

    // Create user-facing Supabase client (needed for auth.getUser)
    const supabase = await createClient();

    // Get current user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Ensure profile exists if user is logged in (orders.user_id has FK to profiles)
    let validUserId: string | null = null;
    if (user) {
      const { error: profileError } = await admin.from('profiles').upsert({
        id: user.id,
        email: user.email || customerEmail,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      }, { onConflict: 'id' });

      if (profileError) {
        log.error('checkout.profile_upsert_failed', { code: E_DB_PROFILE_UPSERT_FAILED, error: profileError.message });
      } else {
        validUserId = user.id;
      }
    }

    // Calculate totals from SERVER prices (not client-supplied)
    const subtotal = serverItems.reduce(
      (sum: number, item: { price: number; quantity: number }) => 
        sum + item.price * item.quantity, 
      0
    );

    // -- Promo code application --
    let discountAmount = 0;
    let appliedPromoId: string | null = null;

    if (promoCode) {
      try {
        const promo = await applyPromo(admin, promoCode, subtotal);
        if (!promo.success) {
          throw new Error(promo.message);
        }
        discountAmount = promo.discountValue;
        appliedPromoId = promo.promoId;
        log.info('checkout.promo_applied', { promoCode, discountAmount, promoId: appliedPromoId });
      } catch (promoErr) {
        log.error('checkout.promo_failed', { code: E_PROMO_APPLY_FAILED, promoCode, error: promoErr instanceof Error ? promoErr.message : String(promoErr) });
        throw new ApiError(E_PROMO_APPLY_FAILED, promoErr instanceof Error ? promoErr.message : 'Invalid promo code', 400);
      }
    }

    // Server-side totals: subtotal → discount → tax → total
    const postDiscount = Math.max(subtotal - discountAmount, 0);
    const taxAmount = Math.round(postDiscount * 0.18 * 100) / 100; // 18% Turkish VAT
    const totalAmount = Math.round((postDiscount + taxAmount) * 100) / 100;

    // Create order using admin client to bypass RLS
    // Column names must match the ACTUAL orders table in the database:
    //   customer_email, customer_name, customer_phone, shipping_address
    //   subtotal, tax, total_amount (not "total")
    // NOTE: The table pre-dates migration 001 so column names differ from the DDL.
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: validUserId,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone || '',
        shipping_address: customerAddress || '',
        status: 'pending',
        subtotal,
        tax: taxAmount,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        promo_code_id: appliedPromoId,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      })
      .select()
      .single();

    if (orderError) {
      log.error('checkout.order_create_failed', { code: E_DB_ORDER_CREATE_FAILED, error: orderError.message });
      throw new ApiError(E_DB_ORDER_CREATE_FAILED, 'Failed to create order', 500);
    }

    // Create order items from SERVER-verified data.
    // Core columns: order_id, product_id, product_name, quantity, unit_price
    // Optional columns (added by later migrations): product_image, total_price
    // product_id must reference an existing products row. For sample-data fallback
    // products (not in DB), set product_id to null to avoid FK violation.

    // Probe schema cache once to see which optional columns exist
    const { data: probe } = await admin.from('order_items').select('product_image,total_price').limit(0);
    const hasProductImage = probe !== null; // null means column doesn't exist (error)
    const hasTotalPrice = (() => {
      // If the probe succeeded, both columns exist. If it failed, test individually.
      if (probe !== null) return true;
      return false; // conservative — omit until migration is applied
    })();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems = serverItems.map((item: { id: string; name: string; price: number; quantity: number; image: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: Record<string, any> = {
        order_id: order.id,
        product_id: dbIds.has(item.id) ? item.id : null,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      };
      if (hasProductImage) row.product_image = item.image ?? null;
      if (hasTotalPrice) row.total_price = Math.round(item.price * item.quantity * 100) / 100;
      return row;
    });

    const { error: itemsError } = await admin.from('order_items').insert(orderItems);

    if (itemsError) {
      log.error('checkout.order_items_failed', { code: E_DB_ORDER_ITEMS_FAILED, error: itemsError.message });
      // Cancel the order — can't proceed without line items
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      throw new ApiError(E_DB_ORDER_ITEMS_FAILED, 'Failed to create order items', 500);
    }

    // ── Atomic stock reservation ──────────────────────────────
    // Each item's stock is decremented inside a Postgres function that uses
    // WHERE stock >= quantity, preventing concurrent oversell.
    const reservationItems = serverItems.map((item) => ({
      productId: item.id,
      variantId: items.find((i: { id: string; variantId?: string }) => i.id === item.id)?.variantId ?? null,
      quantity: item.quantity,
    }));

    const reservation = await reserveStock(reservationItems, order.id);

    if (!reservation.success) {
      // Cancel the pending order — nothing was charged yet
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      log.warn('checkout.out_of_stock', {
        code: E_OUT_OF_STOCK,
        productId: reservation.insufficientStockFor,
        orderId: order.id,
      });
      log.count('checkout_out_of_stock');
      throw new ApiError(E_OUT_OF_STOCK, 'One or more items in your cart are out of stock', 409);
    }

    // Create Stripe checkout session with server-verified prices + timeout
    let session;
    try {
      session = await withTimeout(
        createCheckoutSession(serverItems, customerEmail, order.id, locale || 'en'),
        10_000,
        'stripe.createCheckoutSession',
      );
    } catch (stripeErr) {
      // Stripe failed → cancel pending order and release the stock we just locked
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id).then(
        () => log.info('checkout.order_cancelled_after_stripe_failure', { orderId: order.id }),
        (cancelErr) => log.error('checkout.order_cancel_failed', { orderId: order.id, error: String(cancelErr) }),
      );
      await releaseReservations(order.id).catch((releaseErr) => {
        log.error('checkout.reservation_release_failed', {
          orderId: order.id,
          error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
        });
      });
      // Rollback promo usage if Stripe fails
      if (appliedPromoId) {
        await rollbackPromo(admin, appliedPromoId);
        log.info('checkout.promo_rolled_back', { promoId: appliedPromoId });
      }
      throw stripeErr;
    }

    // Update order with Stripe session ID (dual-write: both v1 and v2 columns)
    // Fall back to v1-only if migration 014 (stripe_session_v2) hasn't been applied.
    const { error: sessionUpdateError } = await admin
      .from('orders')
      .update(dualWriteStripeSession(session.id))
      .eq('id', order.id);

    if (sessionUpdateError) {
      log.warn('checkout.dual_write_failed_fallback_v1', { error: sessionUpdateError.message });
      await admin
        .from('orders')
        .update({ stripe_session_id: session.id })
        .eq('id', order.id);
    }

    log.info('checkout.success', { orderId: order.id, totalAmount, items: items.length });
    log.metric('checkout_duration_ms', elapsed());
    log.count('checkout_success');

    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (err) {
    // Log metrics before re-throwing for withHandler
    if (!(err instanceof ApiError)) {
      log.error('checkout.failed', { code: E_STRIPE_CHECKOUT_FAILED, error: err instanceof Error ? err.message : String(err) });
      captureWithContext(err, 'checkout', { requestId });
    }
    log.count('checkout_error');
    log.metric('checkout_duration_ms', elapsed());
    throw err instanceof ApiError
      ? err
      : new ApiError(E_STRIPE_CHECKOUT_FAILED, 'Failed to create checkout session', 500);
  }
});
