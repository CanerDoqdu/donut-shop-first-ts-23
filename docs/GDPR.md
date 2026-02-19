# GDPR-ish Data Management Plan

> Data subject rights implementation for Glazed & Sipped.
> Not legal advice — consult a DPO for production compliance.

---

## 1. Right to Access (Data Export)

### Current Status: Documented (endpoint planned)

**Future Endpoint:** `POST /api/user/export`

**Scope:** All data associated with the authenticated user:

| Table | Exported Fields |
|-------|-----------------|
| `profiles` | All columns |
| `orders` + `order_items` | All orders (including soft-deleted) |
| `loyalty_points` + `points_transactions` | Balance + history |
| `gift_cards` | Cards purchased by user |
| `subscriptions` + `subscription_deliveries` | Subscription data |
| `reviews` | User's reviews |
| `referrals` + `referral_codes` | Referral data |
| `notifications` | Notification history |

**Format:** JSON bundle (one file per table) + CSV summary.

**Authentication:** Requires active session + email confirmation.

**Rate Limit:** 1 export per 24 hours per user.

---

## 2. Right to Erasure (Data Deletion)

### Current Status: Documented (endpoint planned)

**Future Endpoint:** `POST /api/user/delete`

**Deletion Strategy:**

| Step | Action | Method |
|------|--------|--------|
| 1 | Cancel active subscriptions | Set status = 'cancelled', null out Stripe IDs |
| 2 | Soft-delete orders | Set `deleted_at` = NOW() |
| 3 | Anonymise profile | Replace PII with `[deleted]`, null phone/address |
| 4 | Deactivate gift cards | Set `is_active = false` |
| 5 | Delete loyalty data | Hard-delete `loyalty_points` + `points_transactions` |
| 6 | Delete reviews | Hard-delete (or anonymise author) |
| 7 | Delete notifications | Hard-delete |
| 8 | Revoke auth session | `supabase.auth.admin.deleteUser(userId)` |
| 9 | Emit audit log | `action: 'user.delete_request'` (no PII in log) |

**Legal Hold Exception:**
- Orders required for tax/finance compliance retain: `id`, `total`, `tax`, `status`, `created_at`.
- All PII columns (`user_email`, `user_name`, `user_phone`, `user_address`) are set to `[redacted]`.

**Cooling-Off Period:** 30 days. During this window the account is deactivated but recoverable. After 30 days, hard-delete is irreversible.

---

## 3. Right to Rectification

Users can update their profile data via the `/account` page at any time:
- Full name, phone, address, avatar.
- Email changes require re-verification through Supabase Auth.

---

## 4. Data Minimisation

| Principle | Implementation |
|-----------|----------------|
| Collect only what's needed | Checkout requires: name, email, phone, address. No extra fields. |
| Ephemeral cart | Cart stored in `localStorage` with 2-day expiry. Never persisted server-side. |
| No tracking cookies | No third-party analytics. Web Vitals beacon to own endpoint only. |
| Minimal logging | P1 data never logged. Request IDs used for correlation instead. |

---

## 5. Breach Notification Plan

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Detect breach (logs, alerts, Stripe notification) | Immediate |
| 2 | Assess scope: which tables, how many users | Within 4 hours |
| 3 | Rotate all secrets (Supabase, Stripe, JWT) | Within 4 hours |
| 4 | Notify affected users via email | Within 72 hours |
| 5 | File incident report | Within 72 hours |
| 6 | Post-mortem + remediation | Within 2 weeks |

---

## 6. Audit Trail

All data governance actions are recorded in `audit_log`:

| Action | Trigger |
|--------|---------|
| `user.export_request` | Data export initiated |
| `user.delete_request` | Account deletion initiated |
| `user.delete_completed` | Account hard-deleted after cooling-off |
| `user.profile_updated` | Profile PII changed |
| `admin.data_access` | Admin views user PII |

The audit log is **append-only** (enforced by migration `007_audit_log_append_only.sql`).
