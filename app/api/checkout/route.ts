import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from '@/lib/supabase/env';
import { getProductsByIds } from '@/lib/data';
import { validateOrigin } from '@/lib/security';
import { CART_EXPIRY_MS } from '@/lib/constants';
import { checkoutSchema, parseBody } from '@/lib/validations';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { featureFlags } from '@/lib/config';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { logger, startTimer } from '@/lib/logger';
import {
  E_RATE_LIMITED,
  E_VALIDATION_FAILED,
  E_CART_EXPIRED,
  E_PRODUCT_NOT_FOUND,
  E_DB_ORDER_CREATE_FAILED,
  E_DB_ORDER_ITEMS_FAILED,
  E_DB_PROFILE_UPSERT_FAILED,
  E_STRIPE_CHECKOUT_FAILED,
} from '@/lib/error-codes';

// Helper: create admin-level client that bypasses RLS using service_role key
function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createServerClient(
    url,
    serviceRoleKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

export const POST = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/checkout' });
  const elapsed = startTimer();

  // -- Maintenance mode --
  if (!featureFlags.checkoutEnabled) {
    throw new ApiError('MAINTENANCE', 'Checkout is temporarily disabled', 503);
  }

  // -- CSRF: verify request origin --
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Rate limit: 5 checkout attempts per minute per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`checkout:${ip}`, { maxRequests: 5, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('checkout.rate_limited', { code: E_RATE_LIMITED, ip });
    log.count('checkout_rate_limited');
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
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

    const { items, customerEmail, customerName, customerAddress, locale, cartTimestamp } = parsed.data;

    // -- Server-side cart expiry check --
    if (cartTimestamp) {
      const age = Date.now() - cartTimestamp;
      if (age > CART_EXPIRY_MS) {
        log.info('checkout.cart_expired', { code: E_CART_EXPIRED });
        throw new ApiError(E_CART_EXPIRED, 'Cart expired. Please refresh and try again.', 410);
      }
    }

    // -- Server-truth pricing: look up real prices from lib/data.ts --
    const productIds = items.map((item) => item.id);
    const productMap = getProductsByIds(productIds);

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

    // Create Supabase clients
    const supabase = await createClient();
    const admin = createAdminClient();
    
    // Get current user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Ensure profile exists if user is logged in (orders.user_id has FK to profiles)
    let validUserId: string | null = null;
    if (user) {
      const { error: profileError } = await admin.from('profiles').upsert({
        id: user.id,
        email: user.email || customerEmail,
        full_name: customerName || user.user_metadata?.full_name || user.user_metadata?.name || null,
      }, { onConflict: 'id' });

      if (profileError) {
        log.error('checkout.profile_upsert_failed', { code: E_DB_PROFILE_UPSERT_FAILED, error: profileError.message });
      } else {
        validUserId = user.id;
      }
    }

    // Calculate totals from SERVER prices (not client-supplied)
    const totalAmount = serverItems.reduce(
      (sum: number, item: { price: number; quantity: number }) => 
        sum + item.price * item.quantity, 
      0
    );

    // Create order using admin client to bypass RLS
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: validUserId,
        status: 'pending',
        total_amount: totalAmount,
        shipping_address: customerAddress || '',
      })
      .select()
      .single();

    if (orderError) {
      log.error('checkout.order_create_failed', { code: E_DB_ORDER_CREATE_FAILED, error: orderError.message });
      throw new ApiError(E_DB_ORDER_CREATE_FAILED, 'Failed to create order', 500);
    }

    // Create order items from SERVER-verified data
    const orderItems = serverItems.map((item: { id: string; name: string; price: number; quantity: number }) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsError } = await admin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      log.error('checkout.order_items_failed', { code: E_DB_ORDER_ITEMS_FAILED, error: itemsError.message });
    }

    // Create Stripe checkout session with server-verified prices + timeout
    const session = await withTimeout(
      createCheckoutSession(serverItems, customerEmail, order.id, locale || 'en'),
      10_000,
      'stripe.createCheckoutSession',
    );

    // Update order with Stripe session ID
    await admin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    log.info('checkout.success', { orderId: order.id, totalAmount, items: items.length });
    log.metric('checkout_duration_ms', elapsed());
    log.count('checkout_success');

    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (err) {
    // Log metrics before re-throwing for withHandler
    if (!(err instanceof ApiError)) {
      log.error('checkout.failed', { code: E_STRIPE_CHECKOUT_FAILED, error: err instanceof Error ? err.message : String(err) });
    }
    log.count('checkout_error');
    log.metric('checkout_duration_ms', elapsed());
    throw err instanceof ApiError
      ? err
      : new ApiError(E_STRIPE_CHECKOUT_FAILED, 'Failed to create checkout session', 500);
  }
});
