import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { env } from '@/lib/env';
import { getRequestId } from '@/lib/api-error';
import { featureFlags } from '@/lib/config';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { logger, startTimer } from '@/lib/logger';
import type { Logger } from '@/lib/logger';
import { captureWithContext } from '@/lib/sentry';
import { confirmReservations, releaseReservations } from '@/lib/inventory';
import { enqueueEmail, enqueueLoyaltyPoints } from '@/lib/queue';
import { API_VERSION } from '@/lib/constants';
import {
  E_WEBHOOK_SIGNATURE_MISSING,
  E_WEBHOOK_SIGNATURE_INVALID,
  E_WEBHOOK_HANDLER_ERROR,
  E_WEBHOOK_IDEMPOTENCY_FAILED,
  E_WEBHOOK_ORDER_UPDATE_FAILED,
  E_WEBHOOK_RPC_UNAVAILABLE,
} from '@/lib/error-codes';
import { dualWriteStripeSession } from '@/lib/migration';

// ── Supabase admin client (service_role — bypasses RLS) ──────
function createSupabaseAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Idempotency ──────────────────────────────────────────────
/**
 * INSERT the Stripe event ID into `stripe_events`.
 * Returns `true` if this is a new event, `false` if already processed.
 *
 * The table uses a PRIMARY KEY on `event_id`, so a duplicate insert
 * triggers a unique-violation (23505) which we treat as "already seen".
 *
 * If the table doesn't exist yet (migration not run), we log a warning
 * and allow processing so the webhook isn't blocked.
 */
async function recordEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('stripe_events')
    .insert({ event_id: eventId, event_type: eventType });

  // unique_violation → already processed
  if (error?.code === '23505') return false;

  if (error) {
    // Table may not exist yet — warn but don't block
    logger.warn('webhook.idempotency_insert_failed', {
      code: E_WEBHOOK_IDEMPOTENCY_FAILED,
      eventId,
      pgCode: error.code,
      error: error.message,
    });
  }

  return true;
}

// ── Main Handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const log = logger.withContext({ requestId, path: '/api/webhooks/stripe' });
  const elapsed = startTimer();

  // ── Maintenance mode ──
  if (!featureFlags.webhooksEnabled) {
    log.warn('webhook.maintenance_mode', { requestId });
    return NextResponse.json(
      { code: 'MAINTENANCE', message: 'Webhook processing is disabled', requestId },
      { status: 503, headers: { 'x-request-id': requestId, 'x-api-version': API_VERSION } },
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    log.warn('webhook.missing_signature', { code: E_WEBHOOK_SIGNATURE_MISSING, requestId });
    return NextResponse.json(
      { code: E_WEBHOOK_SIGNATURE_MISSING, message: 'Missing stripe signature', requestId },
      { status: 400, headers: { 'x-request-id': requestId, 'x-api-version': API_VERSION } },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    log.error('webhook.signature_invalid', {
      code: E_WEBHOOK_SIGNATURE_INVALID,
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { code: E_WEBHOOK_SIGNATURE_INVALID, message: 'Invalid signature', requestId },
      { status: 400, headers: { 'x-request-id': requestId, 'x-api-version': API_VERSION } },
    );
  }

  // ── Idempotency: skip already-processed events ─────────────
  const isNew = await recordEvent(supabaseAdmin, event.id, event.type);
  if (!isNew) {
    log.info('webhook.duplicate_skipped', {
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json(
      { received: true },
      { headers: { 'x-request-id': requestId, 'x-api-version': API_VERSION } },
    );
  }

  log.info('webhook.processing', { eventId: event.id, type: event.type });

  // ── Route to handler ───────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await withTimeout(
          handleCheckoutCompleted(
            supabaseAdmin,
            event.data.object as Stripe.Checkout.Session,
            log,
          ),
          15_000,
          'webhook.handleCheckoutCompleted',
        );
        break;
      }

      case 'checkout.session.expired': {
        await withTimeout(
          handleCheckoutExpired(
            supabaseAdmin,
            event.data.object as Stripe.Checkout.Session,
            log,
          ),
          15_000,
          'webhook.handleCheckoutExpired',
        );
        break;
      }

      case 'payment_intent.succeeded': {
        handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          log,
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          log,
        );
        break;
      }

      default:
        log.info('webhook.unhandled_type', { type: event.type });
    }
  } catch (err) {
    log.error('webhook.handler_error', {
      code: E_WEBHOOK_HANDLER_ERROR,
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    captureWithContext(err, 'webhook', { eventId: event.id, eventType: event.type, requestId });
    log.count('webhook_error');
    log.metric('webhook_duration_ms', elapsed());
    // Return 500 so Stripe retries this event
    return NextResponse.json(
      { code: E_WEBHOOK_HANDLER_ERROR, message: 'Internal error', requestId },
      { status: 500, headers: { 'x-request-id': requestId, 'x-api-version': API_VERSION } },
    );
  }

  log.count('webhook_success');
  log.metric('webhook_duration_ms', elapsed());

  return NextResponse.json(
    { received: true },
    { headers: { 'x-request-id': requestId, 'x-api-version': API_VERSION } },
  );
}

// ── checkout.session.completed ───────────────────────────────
/**
 * Uses the `process_payment_completed` RPC (Postgres function) to
 * atomically update the order status AND award loyalty points in a
 * single transaction.
 *
 * Falls back to a simple UPDATE if the RPC is not deployed yet.
 */
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  log: Logger,
) {
  log.info('webhook.checkout_completed', {
    sessionId: session.id,
    paymentIntent: session.payment_intent,
    customerEmail: session.customer_email,
  });

  // Try transactional RPC first
  const { data, error: rpcError } = await supabase.rpc(
    'process_payment_completed',
    {
      p_stripe_session_id: session.id,
      p_payment_intent_id: (session.payment_intent as string) || '',
    },
  );

  if (rpcError) {
    // RPC not deployed yet — fall back to simple update
    log.warn('webhook.rpc_unavailable_fallback', {
      code: E_WEBHOOK_RPC_UNAVAILABLE,
      sessionId: session.id,
      error: rpcError.message,
    });

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
        // Dual-write: ensure v2 column is populated even on fallback path
        ...dualWriteStripeSession(session.id),
      })
      .eq('stripe_session_id', session.id)
      .eq('status', 'pending');

    if (updateError) {
      log.error('webhook.order_update_failed', {
        code: E_WEBHOOK_ORDER_UPDATE_FAILED,
        sessionId: session.id,
        error: updateError.message,
      });
      throw updateError;
    }

    log.info('webhook.order_paid_fallback', { sessionId: session.id });

    // Confirm reservations via fallback path too
    const fallbackOrderId = session.metadata?.orderId;
    if (fallbackOrderId) {
      await confirmReservations(fallbackOrderId, fallbackOrderId).catch((err) => {
        log.error('webhook.reservation_confirm_failed_fallback', {
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
    return;
  }

  const result = data as {
    success: boolean;
    order_id?: string;
    points_awarded?: number;
    reason?: string;
  } | null;

  if (!result?.success) {
    log.warn('webhook.order_not_updated', {
      sessionId: session.id,
      reason: result?.reason,
    });
    return;
  }

  log.info('webhook.order_paid', {
    orderId: result.order_id,
    pointsAwarded: result.points_awarded,
  });

  // Enqueue order confirmation email (async, non-blocking)
  if (session.customer_email && result.order_id) {
    enqueueEmail({
      type: 'order_confirmation',
      to: session.customer_email,
      subject: `Order #${result.order_id} Confirmed!`,
      templateData: {
        orderId: result.order_id,
        total: (session.amount_total ?? 0) / 100,
        customerEmail: session.customer_email,
      },
    }).catch((err) => {
      log.warn('webhook.email_enqueue_failed', {
        orderId: result.order_id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Enqueue loyalty points via job queue (async, non-blocking)
  if (result.order_id && result.points_awarded && session.metadata?.userId) {
    enqueueLoyaltyPoints({
      userId: session.metadata.userId,
      orderId: result.order_id,
      orderTotal: (session.amount_total ?? 0) / 100,
      points: result.points_awarded,
    }).catch((err) => {
      log.warn('webhook.loyalty_enqueue_failed', {
        orderId: result.order_id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Confirm stock reservations — moves status from 'pending' → 'confirmed'
  const orderId = result.order_id ?? session.metadata?.orderId;
  if (orderId) {
    await confirmReservations(orderId, orderId).catch((err) => {
      log.error('webhook.reservation_confirm_failed', {
        sessionId: session.id,
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

// ── checkout.session.expired ─────────────────────────────────
async function handleCheckoutExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  log: Logger,
) {
  log.info('webhook.checkout_expired', { sessionId: session.id });

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('stripe_session_id', session.id)
    .eq('status', 'pending'); // only cancel if still pending

  if (error) {
    log.error('webhook.cancel_failed', {
      code: E_WEBHOOK_ORDER_UPDATE_FAILED,
      sessionId: session.id,
      error: error.message,
    });
    throw error;
  }

  // Release stock reservations — restores stock from 'pending' reservations
  const orderId = session.metadata?.orderId;
  if (orderId) {
    await releaseReservations(orderId).catch((err) => {
      log.error('webhook.reservation_release_failed', {
        sessionId: session.id,
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

// ── payment_intent.succeeded ─────────────────────────────────
/**
 * Order status is already updated via checkout.session.completed.
 * This handler provides an additional confirmation audit log.
 */
function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent, log: Logger) {
  log.info('webhook.payment_intent_succeeded', {
    paymentIntentId: pi.id,
    amount: pi.amount,
    currency: pi.currency,
  });
}

// ── payment_intent.payment_failed ────────────────────────────
function handlePaymentIntentFailed(pi: Stripe.PaymentIntent, log: Logger) {
  log.warn('webhook.payment_intent_failed', {
    paymentIntentId: pi.id,
    amount: pi.amount,
    lastError: pi.last_payment_error?.message,
  });
}
