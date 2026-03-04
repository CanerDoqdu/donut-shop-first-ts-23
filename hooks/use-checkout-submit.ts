'use client';

import { useState, useCallback, useRef } from 'react';
import { getOrCreateIdempotencyKey, rotateIdempotencyKey } from '@/lib/idempotency';
import { telemetry } from '@/lib/telemetry';
import { isEnabled } from '@/lib/feature-flags';

// ── Constants ────────────────────────────────────────────────

/** Hard timeout for checkout fetch — prevents infinite in-flight lock */
const CHECKOUT_TIMEOUT_MS = 30_000;

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
 *  3. AbortController — enforces hard timeout on network requests
 *  4. Deterministic cleanup — finally block always releases lock
 *
 * Race condition timeline prevented:
 * ```
 *   T0: User double-clicks → submit() called twice
 *   T1: First call acquires inflight lock → proceeds
 *   T2: Second call sees inflight=true → returns same promise
 *   T3: Server receives 1 request (not 2)
 *   T4: If somehow 2 arrive, server returns 409 on duplicate idempotency key
 *   T5: Timeout fires at 30s → abort + release lock → user can retry
 * ```
 */
export function useCheckoutSubmit(): UseCheckoutSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef<Promise<CheckoutResult> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    // Guard: if already in-flight, return the same promise (dedup)
    if (inflightRef.current) {
      return inflightRef.current;
    }

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = getOrCreateIdempotencyKey();

    // ── Telemetry: checkout_started ──
    if (isEnabled('product_telemetry', idempotencyKey)) {
      telemetry.track('checkout_started', {
        cartSize: payload.items.length,
        cartTotal: 0, // server-truth pricing — client doesn't know total
      });
    }

    // ── AbortController for hard timeout ──
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);

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
          signal: controller.signal,
        });

        // Handle idempotency conflict (409) — order already exists
        if (res.status === 409) {
          const data = await res.json();
          // If server returned the existing order, treat as success (replay-safe)
          if (data.orderId) {
            // Don't rotate key — the existing order was for this key
            return { url: data.url || '', orderId: data.orderId };
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

        // ── Telemetry: checkout_success ──
        if (isEnabled('product_telemetry', idempotencyKey)) {
          telemetry.track('checkout_success', {
            orderId: data.orderId,
            total: 0,
            itemCount: payload.items.length,
          });
        }

        return { url: data.url, orderId: data.orderId };
      } catch (err) {
        // Map AbortError to a user-friendly timeout message
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        const message = isTimeout
          ? 'Checkout timed out. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Unknown checkout error';

        // ── Telemetry: checkout_failed ──
        if (isEnabled('product_telemetry', idempotencyKey)) {
          telemetry.track('checkout_failed', {
            error: message,
            step: isTimeout ? 'timeout' : 'payment',
          });
        }

        setError(message);
        throw err;
      } finally {
        // Deterministic cleanup — always release lock regardless of outcome
        clearTimeout(timeoutId);
        abortRef.current = null;
        inflightRef.current = null;
        setIsSubmitting(false);
      }
    })();

    inflightRef.current = request;
    return request;
  }, []); // No external deps captured — all state accessed via refs or stable setters

  return { submit, isSubmitting, error, clearError };
}
