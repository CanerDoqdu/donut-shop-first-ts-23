# Webhook Dead-Letter / Replay Strategy

## Overview

Stripe automatically retries failed webhook deliveries (HTTP 5xx) with
exponential backoff for up to 3 days. This means our primary
dead-letter mechanism is Stripe's built-in retry system.

## When Events Are Lost

An event is "lost" only if:
1. Our handler returned 500 for every retry attempt (unlikely with 15+ retries).
2. The `stripe_events` idempotency table incorrectly marked a new event as duplicate.

## Manual Replay

For events that need manual replay:

### Option A — Stripe Dashboard (recommended)

1. Go to Stripe Dashboard > Developers > Webhooks.
2. Select the endpoint.
3. Find the failed event by ID or date range.
4. Click "Resend" to trigger redelivery.

### Option B — Stripe CLI (local/staging)

```bash
# List recent events
stripe events list --limit 10

# Resend a specific event
stripe events resend evt_xxxxxxxxxxxxx

# Replay all events from a time window
stripe listen --forward-to localhost:3000/api/webhooks/stripe --events checkout.session.completed
```

### Option C — Admin Replay Script (future)

If volume demands it, create an admin-only endpoint:

```
POST /api/admin/webhooks/replay
Body: { "eventId": "evt_xxx" }
Auth: admin-only (isAdmin check)
```

This endpoint would:
1. Fetch the event from Stripe API (`stripe.events.retrieve(eventId)`).
2. Delete the row from `stripe_events` (reset idempotency).
3. Re-process the event through the same handler chain.

Not yet implemented — Stripe Dashboard replay is sufficient at current scale.

## Monitoring

- `webhook.handler_error` log entries indicate events that failed processing.
- `webhook.duplicate_skipped` log entries confirm idempotency is working.
- `webhook.signature_invalid` entries suggest misconfigured webhook secrets.

## Maintenance Mode

Set `WEBHOOKS_ENABLED=false` in environment to return 503 for all webhook
deliveries. Stripe will retry when the service is re-enabled.

Use this during:
- Database migrations that alter order/payment tables.
- Extended maintenance windows.
- Incident response when webhook processing causes cascading failures.
