import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// Helper: create admin-level client that bypasses RLS using service_role key
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 checkout attempts per minute per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`checkout:${ip}`, { maxRequests: 5, windowSizeSeconds: 60 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const { items, customerEmail, customerName, customerPhone, customerAddress, locale } = await req.json();

    if (!items || !items.length || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    // Calculate totals
    const totalAmount = items.reduce(
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
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items using admin client to bypass RLS
    const orderItems = items.map((item: { 
      id: string; 
      name: string; 
      price: number; 
      quantity: number;
      image?: string;
    }) => ({
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

    // Create Stripe checkout session
    const session = await createCheckoutSession(items, customerEmail, order.id, locale || 'en');

    // Update order with Stripe session ID
    await admin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
