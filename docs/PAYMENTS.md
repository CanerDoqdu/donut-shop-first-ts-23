# Payments Documentation

## Flow

```
Cart (Zustand) → POST /api/checkout → Stripe Checkout Session → Webhook → Order Update
```

### 1. Cart (Client)
- Zustand store with localStorage persistence (`cart-store.ts`)
- 2-day expiry (`CART_EXPIRY_MS = 172800000`)
- `cartTimestamp` tracked for server-side validation

### 2. Checkout API (`/api/checkout`)
1. CSRF origin check
2. Rate limiting (5/min/IP)
3. Input sanitization
4. **Server-truth pricing**: client sends `{ id, quantity }[]` only
5. Products looked up via `getProductsByIds()`
6. Profile upsert (admin client, bypasses RLS)
7. Order + order_items created with server-computed totals
8. Stripe Checkout Session created with:
   - Idempotency key per orderId
   - 30-min `expires_at`
   - Server-verified line items
9. Returns `{ url, orderId }`

### 3. Stripe Webhook (`/api/webhooks/stripe`)
1. Signature verification (`stripe.webhooks.constructEvent`)
2. Idempotency check (`stripe_events` table)
3. `checkout.session.completed`:
   - Calls `process_payment_completed` RPC (atomic order status + loyalty points)
   - Fallback to simple UPDATE if RPC not deployed
4. `payment_intent.succeeded`: audit logging

### 4. Gift Card Checkout (`/api/checkout/gift-card`)
- Separate endpoint for gift card purchases
- Rate limited (3/min/IP)
- Uses Stripe Checkout with gift card metadata
- Sends gift card email via Resend on success

## Stripe Configuration

| Setting | Value |
|---------|-------|
| API Version | Latest (stripe@20.x) |
| Checkout Mode | `payment` |
| Session Expiry | 30 minutes |
| Idempotency | Per `orderId` |
| Webhook Events | `checkout.session.completed`, `payment_intent.succeeded` |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side publishable key |
