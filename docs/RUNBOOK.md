# Runbook

## Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T10:00:00.000Z",
  "version": "0.1.0"
}
```

## Common Issues

### 1. Missing Environment Variables
**Symptom**: App crashes at startup with `[env] Missing required environment variable: X`
**Fix**: Check `.env.local` against `.env.example`. All required vars must be set.

### 2. Stripe Webhook Failures
**Symptom**: Orders stuck in `pending` status after payment
**Check**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. Check `stripe_events` table for duplicate event IDs
3. Review server logs for webhook signature errors
4. Ensure webhook URL is `https://your-domain.com/api/webhooks/stripe`

### 3. Rate Limit Triggered
**Symptom**: 429 Too Many Requests on auth/checkout endpoints
**Info**: In-memory rate limiter resets on server restart. Limits:
- Auth: 5 req/min/IP
- Checkout: 5 req/min/IP
- Gift cards: 3 req/min/IP

### 4. CSRF Origin Rejection
**Symptom**: 403 Forbidden on mutation API calls
**Check**:
1. `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` must match the request origin
2. In production, requests without Origin/Referer headers are rejected
3. Webhooks (Stripe) bypass origin check — they don't call `validateOrigin`

### 5. Admin Access Denied
**Symptom**: Redirected away from `/admin/*` routes
**Fix**: User must exist in `admin_users` table. Insert via Supabase SQL Editor:
```sql
INSERT INTO admin_users (user_id) VALUES ('user-uuid-here');
```

### 6. Cart Expired
**Symptom**: 410 Gone on checkout
**Cause**: Cart older than 2 days (CART_EXPIRY_MS = 172800000)
**Fix**: User must refresh cart and re-add items

## Database Migrations

Run in order via Supabase SQL Editor:
1. `supabase/schema.sql` — Core tables
2. `supabase/schema-extended.sql` — Extended tables
3. `scripts/005-soft-delete-and-audit.sql` — Soft-delete + audit log

## Monitoring

### Structured Logs
All server logs are JSON format (`lib/logger.ts`):
```json
{"level":"info","message":"Request","service":"donut-shop","requestId":"abc-123","method":"POST","path":"/api/checkout"}
```

### Web Vitals
Client reports CLS, FID, FCP, LCP, TTFB to `/api/vitals`.

### Request Tracing
Every request gets an `x-request-id` header (generated in middleware if not present).

## Deployment Checklist

- [ ] All env vars set (check `.env.example`)
- [ ] Supabase migrations applied
- [ ] Stripe webhook configured and verified
- [ ] Admin users seeded in `admin_users` table
- [ ] HTTPS enabled (required for HSTS, secure cookies)
- [ ] CI pipeline green (lint, typecheck, test, build)
