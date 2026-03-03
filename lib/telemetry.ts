/**
 * Product Telemetry — Funnel & Guardrail Metrics
 *
 * Typed event tracking for the purchase funnel + guardrail metrics.
 *
 * Funnel events:
 *   product_view → add_to_cart → checkout_started → checkout_success / checkout_failed
 *
 * Guardrail metrics:
 *   - Checkout error rate (should stay < 5%)
 *   - API latency p95 (should stay < 2s)
 *
 * Integrates with the existing MetricsCollector (lib/metrics.ts)
 * and structured logger (lib/logger.ts).
 *
 * Usage:
 *   import { telemetry } from '@/lib/telemetry';
 *
 *   telemetry.track('product_view', { productId: 'abc' });
 *   telemetry.track('add_to_cart', { productId: 'abc', quantity: 2 });
 *   telemetry.track('checkout_started', { cartSize: 3, cartTotal: 42.5 });
 *   telemetry.track('checkout_success', { orderId: 'ord_1', total: 42.5 });
 *   telemetry.track('checkout_failed', { error: 'E_STRIPE', step: 'payment' });
 *
 *   const funnel = telemetry.getFunnelMetrics();
 *   const guardrails = telemetry.getGuardrailMetrics();
 */

import { logger } from './logger';
import { metrics } from './metrics';

// ── Event types ─────────────────────────────────────────────

export const TELEMETRY_EVENTS = [
  'product_view',
  'add_to_cart',
  'checkout_started',
  'checkout_success',
  'checkout_failed',
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENTS)[number];

export interface TelemetryEventPayloads {
  product_view: { productId: string; source?: string };
  add_to_cart: { productId: string; quantity: number; source?: string };
  checkout_started: { cartSize: number; cartTotal: number };
  checkout_success: { orderId: string; total: number; itemCount?: number };
  checkout_failed: { error: string; step?: string };
}

interface TimestampedEvent<K extends TelemetryEventName = TelemetryEventName> {
  name: K;
  payload: TelemetryEventPayloads[K];
  timestamp: number;
}

// ── Funnel metrics ──────────────────────────────────────────

export interface FunnelMetrics {
  /** Total counts per step */
  counts: Record<TelemetryEventName, number>;
  /** Conversion rates between adjacent steps */
  conversionRates: {
    viewToCart: number;
    cartToCheckoutStart: number;
    checkoutStartToSuccess: number;
    overallConversion: number;
  };
}

// ── Guardrail metrics ───────────────────────────────────────

export interface GuardrailMetrics {
  /** Checkout error rate (0-1) from telemetry events */
  checkoutErrorRate: number;
  /** API latency p95 from MetricsCollector (ms) */
  apiLatencyP95: number;
  /** Guardrail status */
  status: {
    /** checkoutErrorRate < 0.05 */
    checkoutErrorRateOk: boolean;
    /** apiLatencyP95 < 2000ms */
    apiLatencyOk: boolean;
  };
}

// ── Guardrail thresholds ────────────────────────────────────

const GUARDRAIL_CHECKOUT_ERROR_RATE = 0.05; // 5%
const GUARDRAIL_API_LATENCY_P95_MS = 2000; // 2 seconds

// ── Telemetry collector ─────────────────────────────────────

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_EVENTS = 50_000;

export class TelemetryCollector {
  private events: TimestampedEvent[] = [];
  private windowMs: number;
  private maxEvents: number;

  constructor(windowMs = DEFAULT_WINDOW_MS, maxEvents = DEFAULT_MAX_EVENTS) {
    this.windowMs = windowMs;
    this.maxEvents = maxEvents;
  }

  /**
   * Track a funnel event.
   */
  track<K extends TelemetryEventName>(
    name: K,
    payload: TelemetryEventPayloads[K],
  ): void {
    const event: TimestampedEvent<K> = {
      name,
      payload,
      timestamp: Date.now(),
    };

    this.events.push(event as TimestampedEvent);
    this.prune();

    // Also log as structured event
    logger.info(`telemetry:${name}`, payload as Record<string, unknown>);
  }

  /**
   * Compute funnel conversion metrics for the current window.
   */
  getFunnelMetrics(): FunnelMetrics {
    const recent = this.getRecentEvents();
    const counts = this.countByName(recent);

    const viewToCart =
      counts.product_view > 0
        ? counts.add_to_cart / counts.product_view
        : 0;

    const cartToCheckoutStart =
      counts.add_to_cart > 0
        ? counts.checkout_started / counts.add_to_cart
        : 0;

    const checkoutStartToSuccess =
      counts.checkout_started > 0
        ? counts.checkout_success / counts.checkout_started
        : 0;

    const overallConversion =
      counts.product_view > 0
        ? counts.checkout_success / counts.product_view
        : 0;

    return {
      counts,
      conversionRates: {
        viewToCart,
        cartToCheckoutStart,
        checkoutStartToSuccess,
        overallConversion,
      },
    };
  }

  /**
   * Compute guardrail metrics.
   * Combines telemetry checkout data with MetricsCollector API latency.
   */
  getGuardrailMetrics(): GuardrailMetrics {
    const recent = this.getRecentEvents();
    const counts = this.countByName(recent);

    const totalCheckouts = counts.checkout_success + counts.checkout_failed;
    const checkoutErrorRate =
      totalCheckouts > 0 ? counts.checkout_failed / totalCheckouts : 0;

    // Pull p95 from MetricsCollector for the checkout endpoint
    const checkoutSummary = metrics.getEndpointSummary('/api/checkout');
    const apiLatencyP95 = checkoutSummary.latency.p95;

    return {
      checkoutErrorRate,
      apiLatencyP95,
      status: {
        checkoutErrorRateOk: checkoutErrorRate < GUARDRAIL_CHECKOUT_ERROR_RATE,
        apiLatencyOk: apiLatencyP95 < GUARDRAIL_API_LATENCY_P95_MS,
      },
    };
  }

  /**
   * Get all events in the current window (for inspection/testing).
   */
  getRecentEvents(): TimestampedEvent[] {
    const cutoff = Date.now() - this.windowMs;
    return this.events.filter((e) => e.timestamp >= cutoff);
  }

  /**
   * Reset all events (useful for testing).
   */
  reset(): void {
    this.events = [];
  }

  // ── Internal ────────────────────────────────────────────

  private countByName(
    events: TimestampedEvent[],
  ): Record<TelemetryEventName, number> {
    const counts: Record<TelemetryEventName, number> = {
      product_view: 0,
      add_to_cart: 0,
      checkout_started: 0,
      checkout_success: 0,
      checkout_failed: 0,
    };
    for (const e of events) {
      counts[e.name]++;
    }
    return counts;
  }

  private prune(): void {
    if (this.events.length > this.maxEvents) {
      const cutoff = Date.now() - this.windowMs;
      this.events = this.events
        .filter((e) => e.timestamp >= cutoff)
        .slice(-this.maxEvents);
    }
  }
}

// ── Singleton ───────────────────────────────────────────────

export const telemetry = new TelemetryCollector();
