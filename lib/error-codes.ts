/**
 * Stable, categorised error codes for structured logging and API responses.
 *
 * Convention: E_{DOMAIN}_{DETAIL}
 *
 * These codes are:
 *  - Machine-readable (grep-able across log aggregators)
 *  - Stable (never renamed once shipped — deprecate instead)
 *  - Domain-scoped (each prefix maps to a subsystem)
 */

// ── Auth ─────────────────────────────────────────────────────
export const E_AUTH_RATE_LIMITED = 'E_AUTH_RATE_LIMITED';
export const E_AUTH_INVALID_CREDENTIALS = 'E_AUTH_INVALID_CREDENTIALS';
export const E_AUTH_SIGN_UP_FAILED = 'E_AUTH_SIGN_UP_FAILED';
export const E_AUTH_FORGOT_PASSWORD_FAILED = 'E_AUTH_FORGOT_PASSWORD_FAILED';
export const E_AUTH_RESET_PASSWORD_FAILED = 'E_AUTH_RESET_PASSWORD_FAILED';
export const E_AUTH_PROFILE_UPDATE_FAILED = 'E_AUTH_PROFILE_UPDATE_FAILED';
export const E_AUTH_SESSION_MISSING = 'E_AUTH_SESSION_MISSING';

// ── Stripe ───────────────────────────────────────────────────
export const E_STRIPE_CHECKOUT_FAILED = 'E_STRIPE_CHECKOUT_FAILED';
export const E_STRIPE_SESSION_CREATE_FAILED = 'E_STRIPE_SESSION_CREATE_FAILED';
export const E_STRIPE_GIFT_CARD_FAILED = 'E_STRIPE_GIFT_CARD_FAILED';

// ── Database ─────────────────────────────────────────────────
export const E_DB_ORDER_CREATE_FAILED = 'E_DB_ORDER_CREATE_FAILED';
export const E_DB_ORDER_ITEMS_FAILED = 'E_DB_ORDER_ITEMS_FAILED';
export const E_DB_PROFILE_UPSERT_FAILED = 'E_DB_PROFILE_UPSERT_FAILED';
export const E_DB_QUERY_FAILED = 'E_DB_QUERY_FAILED';

// ── Webhook ──────────────────────────────────────────────────
export const E_WEBHOOK_SIGNATURE_MISSING = 'E_WEBHOOK_SIGNATURE_MISSING';
export const E_WEBHOOK_SIGNATURE_INVALID = 'E_WEBHOOK_SIGNATURE_INVALID';
export const E_WEBHOOK_HANDLER_ERROR = 'E_WEBHOOK_HANDLER_ERROR';
export const E_WEBHOOK_IDEMPOTENCY_FAILED = 'E_WEBHOOK_IDEMPOTENCY_FAILED';
export const E_WEBHOOK_ORDER_UPDATE_FAILED = 'E_WEBHOOK_ORDER_UPDATE_FAILED';
export const E_WEBHOOK_RPC_UNAVAILABLE = 'E_WEBHOOK_RPC_UNAVAILABLE';

// ── Validation ───────────────────────────────────────────────
export const E_VALIDATION_FAILED = 'E_VALIDATION_FAILED';
export const E_VALIDATION_ORIGIN_REJECTED = 'E_VALIDATION_ORIGIN_REJECTED';

// ── Email ────────────────────────────────────────────────────
export const E_EMAIL_SEND_FAILED = 'E_EMAIL_SEND_FAILED';
export const E_EMAIL_INVALID_TYPE = 'E_EMAIL_INVALID_TYPE';

// ── General ──────────────────────────────────────────────────
export const E_RATE_LIMITED = 'E_RATE_LIMITED';
export const E_CART_EXPIRED = 'E_CART_EXPIRED';
export const E_PRODUCT_NOT_FOUND = 'E_PRODUCT_NOT_FOUND';
export const E_INTERNAL = 'E_INTERNAL';
