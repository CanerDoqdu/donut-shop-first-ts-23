/**
 * Idempotency key generation and management.
 *
 * Prevents duplicate orders when:
 *  - User double-clicks checkout button
 *  - Network retry sends same POST twice
 *  - Browser back/forward re-submits the form
 *
 * The key is stored in sessionStorage so:
 *  - Same tab retries reuse the key (server deduplicates)
 *  - New tabs get a fresh key (independent checkouts OK)
 *  - Closing the tab clears the key (no stale data)
 */

import { IDEMPOTENCY_KEY_STORAGE } from './constants';

/** Generate a new UUID v4 idempotency key. */
export function generateIdempotencyKey(): string {
  // Prefer native crypto API for true randomness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get existing idempotency key from sessionStorage, or create a new one.
 * This ensures the same key is used for retry attempts of the same checkout.
 */
export function getOrCreateIdempotencyKey(): string {
  try {
    const stored = sessionStorage.getItem(IDEMPOTENCY_KEY_STORAGE);
    if (stored) return stored;

    const key = generateIdempotencyKey();
    sessionStorage.setItem(IDEMPOTENCY_KEY_STORAGE, key);
    return key;
  } catch {
    // sessionStorage unavailable — generate ephemeral key
    return generateIdempotencyKey();
  }
}

/** Clear the stored idempotency key (call after successful checkout). */
export function clearIdempotencyKey(): void {
  try {
    sessionStorage.removeItem(IDEMPOTENCY_KEY_STORAGE);
  } catch {
    // silent
  }
}

/** Rotate to a new key (call after successful order placement). */
export function rotateIdempotencyKey(): string {
  clearIdempotencyKey();
  return getOrCreateIdempotencyKey();
}
