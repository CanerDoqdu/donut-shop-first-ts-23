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

export const POST = withHandler(async (req: NextRequest) => {
  // ── Maintenance mode ──
  if (!featureFlags.checkoutEnabled) {
    throw new ApiError('MAINTENANCE', 'Checkout is temporarily disabled', 503);
  }

  // ── CSRF: verify request origin ──
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Rate limit: 5 checkout attempts per minute per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`checkout:${ip}`, { maxRequests: 5, windowSizeSeconds: 60 });
  if (!limiter.success) {
    throw new ApiError('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
  }

  const body = await req.json();

  // ── Zod validation ──
  const parsed = parseBody(checkoutSchema, body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', parsed.error, 400);
  }

  const { items, customerEmail, customerName, customerAddress, locale, cartTimestamp } = parsed.data;

  // ── Server-side cart expiry check ──
  if (cartTimestamp) {
    const age = Date.now() - cartTimestamp;
    if (age > CART_EXPIRY_MS) {
      throw new ApiError('CART_EXPIRED', 'Cart expired. Please refresh and try again.', 410);
    }
  }

  // ── Server-truth pricing: look up real prices from lib/data.ts ──
  const productIds = items.map((item) => item.id);
  const productMap = getProductsByIds(productIds);

  // Validate every product exists server-side
  const serverItems = items.map((item) => {
    const product = productMap.get(item.id);
    if (!product) {
      throw new ApiError('NOT_FOUND', `Product not found: ${item.id}`, 404);
    }
    return {
      id: product.id,
      name: product.name_en,
      price: product.price,         // SERVER price — never from client
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
    // Use admin client to bypass RLS for profile creation
    const { error: profileError } = await admin.from('profiles').upsert({
      id: user.id,
      email: user.email || customerEmail,
      full_name: customerName || user.user_metadata?.full_name || user.user_metadata?.name || null,
    }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile upsert failed:', profileError);
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
    console.error('Failed to create order:', orderError);
    throw new ApiError('DB_ERROR', 'Failed to create order', 500);
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
    console.error('Failed to create order items:', itemsError);
  }

  // Create Stripe checkout session with server-verified prices (10s timeout)
  const session = await withTimeout(
    createCheckoutSession(serverItems, customerEmail, order.id, locale || 'en'),
    10_000,
    'stripe.checkout.sessions.create',
  );

  // Update order with Stripe session ID
  await admin
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id);

  return NextResponse.json({ url: session.url, orderId: order.id });
});
