# Security Documentation

## Layers

### 1. CSRF / Origin Validation
All mutation API routes call `validateOrigin(req)` from `lib/security.ts`.
- Checks `Origin` header, falls back to `Referer`
- Whitelists `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL`
- Localhost allowed in development mode
- Returns 403 for unrecognized origins

### 2. Rate Limiting
Token bucket algorithm in `lib/rate-limit.ts`:
- **Auth endpoints**: 5 req/min/IP (signIn, signUp, forgotPassword)
- **Checkout**: 5 req/min/IP
- **Gift card checkout**: 3 req/min/IP
- Auto-cleanup of stale entries every 5 minutes

### 3. Input Sanitization
`lib/security.ts` exports:
- `sanitizeString()` — strips HTML tags, entities, trims whitespace
- `sanitizePayload()` — sanitizes all string values in an object
- `isValidEmail()` — structural email validation
- `clampNumber()` — constrains numeric values to safe range

Applied to all API routes processing user input.

### 4. Content Security Policy
Configured in `next.config.ts`:
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
img-src 'self' data: blob: https://*.supabase.co
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com
frame-src https://js.stripe.com https://hooks.stripe.com
object-src 'none'
frame-ancestors 'none'
```

### 5. Security Headers
All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- `X-Powered-By` removed

### 6. Authentication & RBAC
- Supabase Auth handles user sessions
- `lib/auth/admin.ts` provides `isAdmin()`, `requireAdmin()` helpers
- Admin routes protected at middleware level (`proxy.ts`)
- `admin_users` table used for role check (not JWT role claim)

### 7. Server-Truth Pricing
Checkout route ignores client-sent prices. Products looked up via `getProductsByIds()` from `lib/data.ts`. Totals computed server-side.

### 8. Webhook Security
- Stripe signature verification via `stripe.webhooks.constructEvent()`
- `stripe_events` table for idempotency (INSERT ON CONFLICT DO NOTHING)
- Transactional processing via `process_payment_completed` RPC
