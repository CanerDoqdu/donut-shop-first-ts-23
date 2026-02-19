# PII Classification

> Personally Identifiable Information inventory for Glazed & Sipped.

## Data Sensitivity Levels

| Level | Label | Description | Examples |
|-------|-------|-------------|----------|
| **P0** | Highly Sensitive | Auth secrets, tokens, keys | Supabase service role key, Stripe secret key, password reset tokens |
| **P1** | Sensitive PII | Data that can directly identify a person | Email, phone, address, payment identifiers |
| **P2** | Personal | Data that identifies a person in context | Full name, user ID, avatar URL, referral code |
| **P3** | Operational | Non-identifying business data | Order totals, product metadata, analytics events |

---

## Field Inventory

### `profiles`

| Column | Level | Notes |
|--------|-------|-------|
| `id` | P2 | UUID, links to auth.users |
| `email` | P1 | Primary identifier |
| `full_name` | P2 | |
| `phone` | P1 | |
| `address` | P1 | Free-text delivery address |
| `avatar_url` | P2 | May contain Google avatar URL |
| `referral_code` | P2 | Unique per user |
| `referred_by` | P2 | UUID of referrer |

### `orders`

| Column | Level | Notes |
|--------|-------|-------|
| `id` | P3 | |
| `user_id` | P2 | FK to profiles |
| `user_email` | P1 | Denornalised copy for order fulfillment |
| `user_name` | P2 | Denormalised copy |
| `user_phone` | P1 | Denormalised copy |
| `user_address` | P1 | Denormalised copy |
| `stripe_session_id` | P1 | Payment identifier |
| `stripe_payment_intent_id` | P1 | Payment identifier |
| `status`, `subtotal`, `tax`, `total` | P3 | |
| `deleted_at` | P3 | Soft-delete timestamp |

### `order_items`

| Column | Level | Notes |
|--------|-------|-------|
| All columns | P3 | No PII — product metadata + quantities |

### `gift_cards`

| Column | Level | Notes |
|--------|-------|-------|
| `purchaser_id` | P2 | UUID |
| `purchaser_email` | P1 | |
| `recipient_email` | P1 | |
| `recipient_name` | P2 | |
| `message` | P2 | Free-text, may contain personal content |
| `code` | P3 | Gift card code, not PII |

### `subscriptions`

| Column | Level | Notes |
|--------|-------|-------|
| `user_id` | P2 | FK to profiles |
| `stripe_subscription_id` | P1 | Payment identifier |
| `stripe_customer_id` | P1 | Payment identifier |
| Other columns | P3 | Plan metadata |

### `loyalty_points` / `points_transactions`

| Column | Level | Notes |
|--------|-------|-------|
| `user_id` | P2 | FK to profiles |
| Other columns | P3 | Points metadata |

### `referrals` / `referral_codes`

| Column | Level | Notes |
|--------|-------|-------|
| `referrer_id`, `referred_id` | P2 | UUIDs |
| `referral_code`, `code` | P2 | Unique per user |

### `reviews`

| Column | Level | Notes |
|--------|-------|-------|
| `user_id` | P2 | FK to profiles |
| `content`, `title` | P2 | May contain personal opinions |
| `image_urls` | P2 | User-uploaded images |

### `notifications`

| Column | Level | Notes |
|--------|-------|-------|
| `user_id` | P2 | FK to profiles |
| `recipient` | P1 | Email or phone |
| `content` | P2 | May contain personal data |

### `audit_log`

| Column | Level | Notes |
|--------|-------|-------|
| `actor_id` | P2 | UUID of acting user |
| `ip_address` | P1 | Can identify a person |
| `changes` | P1/P2 | JSONB — may contain PII if capturing field diffs |

### `stripe_events`

| Column | Level | Notes |
|--------|-------|-------|
| `stripe_event_id` | P1 | Stripe identifier |
| `payload` | P1 | Raw Stripe event, may contain customer info |

---

## Handling Rules

1. **P0** — Never stored in the database. Environment variables only. Never logged.
2. **P1** — Encrypted at rest (Supabase default). Never written to application logs. Mask in error messages (e.g., `j***@example.com`).
3. **P2** — Acceptable in logs during development; redact in production logs. Include in data export.
4. **P3** — No special handling required.

## Retention Policy

| Data | Retention | Deletion Method |
|------|-----------|-----------------|
| Audit logs | 12 months (configurable) | Automated cleanup job (future) |
| Orders (soft-deleted) | 90 days after soft-delete | Hard-delete via scheduled job |
| Stripe events | 90 days | Automated cleanup |
| Analytics events | 6 months | Automated cleanup |
| User profiles | Until account deletion | GDPR delete flow (see [GDPR.md](GDPR.md)) |
