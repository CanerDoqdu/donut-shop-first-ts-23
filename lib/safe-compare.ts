/**
 * Timing-safe string comparison utility.
 *
 * Prevents timing-based side-channel attacks on secret comparisons.
 * Uses Node.js `crypto.timingSafeEqual` under the hood.
 *
 * @module lib/safe-compare
 */

import { timingSafeEqual } from 'crypto';

/**
 * Compare two strings in constant time.
 *
 * Returns `false` immediately if either value is falsy (prevents
 * undefined === undefined bypass when env vars are missing).
 */
export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Pad shorter to equal length to avoid length-leaking short-circuit
  if (bufA.length !== bufB.length) {
    // Still do a comparison to keep constant-ish time, but always return false
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
