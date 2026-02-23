'use client';

import { useState, useCallback, useRef } from 'react';
import { getOrCreateIdempotencyKey, rotateIdempotencyKey } from '@/lib/idempotency';

// ── Types ────────────────────────────────────────────────────

export interface CheckoutPayload {
  items: Array<{ id: string; quantity: number; variantId?: string }>;
  customerEmail: string;
  customerName: string;
  customerAddress: string;
  locale?: string;
  cartTimestamp?: number;
  promoCode?: string;
}

export interface CheckoutResult {
  url: string;
  orderId: string;
}

export interface UseCheckoutSubmitReturn {
  /** Submit checkout — safe to call multiple times (deduplicates) */
  submit: (payload: CheckoutPayload) => Promise<CheckoutResult>;
  /** Whether a submit is currently in-flight */
  isSubmitting: boolean;
  /** Error from last submit attempt */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Client-side double-submit guard for checkout.
 *
 * Prevents concurrent checkout submissions via:
 *  1. In-flight ref guard — ignores calls while one is pending
 *  2. Idempotency key — server deduplicates via DB unique constraint
 *  3. State tracking — `isSubmitting` for UI button disable
 *
 * Race condition timeline prevented:
 * ```
 *   T0: User double-clicks → submit() called twice
 *   T1: First call acquires inflight lock → proceeds
 *   T2: Second call sees inflight=true → returns same promise
 *   T3: Server receives 1 request (not 2)
 *   T4: If somehow 2 arrive, server returns 409 on duplicate idempotency key
 * ```
 */
export function useCheckoutSubmit(): UseCheckoutSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef<Promise<CheckoutResult> | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    // Guard: if already in-flight, return the same promise (dedup)
    if (inflightRef.current) {
      return inflightRef.current;
    }

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = getOrCreateIdempotencyKey();

    const request = (async (): Promise<CheckoutResult> => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            ...payload,
            idempotencyKey,
          }),
        });

        // Handle idempotency conflict (409) — order already exists
        if (res.status === 409) {
          const data = await res.json();
          // If server returned the existing order, treat as success (replay-safe)
          if (data.orderId) {
            return { url: '', orderId: data.orderId };
          }
          throw new Error(data.error || 'Duplicate checkout request');
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Checkout failed' }));
          throw new Error(data.error || `Checkout failed (${res.status})`);
        }

        const data = await res.json();

        // Success — rotate idempotency key for next checkout
        rotateIdempotencyKey();

        return { url: data.url, orderId: data.orderId };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown checkout error';
        setError(message);
        throw err;
      } finally {
        inflightRef.current = null;
        setIsSubmitting(false);
      }
    })();

    inflightRef.current = request;
    return request;
  }, []);

  return { submit, isSubmitting, error, clearError };
}
