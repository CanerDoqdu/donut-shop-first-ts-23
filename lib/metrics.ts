/**
 * In-memory metrics collection with sliding-window percentile computation.
 *
 * Tracks:
 *  - API response times (p50, p95, p99, max) per endpoint
 *  - Error rates per endpoint
 *  - Checkout outcomes (success / timeout / validation_fail / error)
 *  - Web Vitals per route
 *
 * Design decisions:
 *  - Sliding window (default 5 min) keeps memory bounded
 *  - Percentiles computed on-demand via sorted insertion
 *  - Thread-safe for single Node.js event-loop (no mutex needed)
 *  - Exposed via structured logger for log-based dashboards
 *
 * Usage:
 *   import { metrics } from '@/lib/metrics';
 *   metrics.recordLatency('/api/checkout', 340);
 *   metrics.recordError('/api/checkout', 'E_STRIPE_CHECKOUT_FAILED');
 *   metrics.recordCheckoutOutcome('success');
 *   metrics.recordWebVital('LCP', 2100, '/en');
 *   const summary = metrics.getSummary('/api/checkout');
 */

import { logger } from './logger';

// ── Configuration ───────────────────────────────────────────

/** Default sliding window: 5 minutes. */
const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

/** Maximum data points per metric key (memory safety). */
const DEFAULT_MAX_ENTRIES = 10_000;

// ── Types ───────────────────────────────────────────────────

interface TimestampedValue {
  ts: number;
  value: number;
}

export type CheckoutOutcome = 'success' | 'timeout' | 'validation_fail' | 'error';

export interface LatencySummary {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  avg: number;
}

export interface EndpointSummary {
  latency: LatencySummary;
  errorRate: number;
  errorCount: number;
  totalRequests: number;
}

export interface CheckoutSummary {
  total: number;
  successRate: number;
  timeoutRate: number;
  validationFailRate: number;
  errorRate: number;
}

export interface VitalSummary {
  name: string;
  route: string;
  count: number;
  p50: number;
  p95: number;
  avg: number;
}

// ── Core Metrics Class ──────────────────────────────────────

export class MetricsCollector {
  private windowMs: number;
  private maxEntries: number;
  private latencies = new Map<string, TimestampedValue[]>();
  private errors = new Map<string, TimestampedValue[]>();
  private requests = new Map<string, TimestampedValue[]>();
  private checkoutOutcomes: Array<{ ts: number; outcome: CheckoutOutcome }> = [];
  private vitals = new Map<string, TimestampedValue[]>();

  constructor(windowMs: number = DEFAULT_WINDOW_MS, maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  // ── Recording ───────────────────────────────────────────

  /** Record an API request latency (ms) for an endpoint. */
  recordLatency(endpoint: string, durationMs: number): void {
    this.push(this.latencies, endpoint, durationMs);
    this.push(this.requests, endpoint, 1);
  }

  /** Record an API error for an endpoint. */
  recordError(endpoint: string, _code?: string): void {
    this.push(this.errors, endpoint, 1);
  }

  /** Record a checkout outcome. */
  recordCheckoutOutcome(outcome: CheckoutOutcome): void {
    const now = Date.now();
    this.checkoutOutcomes.push({ ts: now, outcome });
    this.pruneArray(this.checkoutOutcomes);
  }

  /**
   * Record a Web Vital data point.
   * Key format: `{name}:{route}` (e.g., `LCP:/en`)
   */
  recordWebVital(name: string, value: number, route: string): void {
    const key = `${name}:${route}`;
    this.push(this.vitals, key, value);
  }

  // ── Querying ────────────────────────────────────────────

  /** Get latency summary for an endpoint. */
  getLatencySummary(endpoint: string): LatencySummary {
    const values = this.getWindowValues(this.latencies, endpoint);
    return this.computePercentiles(values);
  }

  /** Get full endpoint summary (latency + error rate). */
  getEndpointSummary(endpoint: string): EndpointSummary {
    const latency = this.getLatencySummary(endpoint);
    const errorCount = this.getWindowValues(this.errors, endpoint).length;
    const totalRequests = this.getWindowValues(this.requests, endpoint).length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    return { latency, errorRate, errorCount, totalRequests };
  }

  /** Get checkout outcome breakdown. */
  getCheckoutSummary(): CheckoutSummary {
    const cutoff = Date.now() - this.windowMs;
    const recent = this.checkoutOutcomes.filter((e) => e.ts >= cutoff);
    const total = recent.length;
    if (total === 0) {
      return { total: 0, successRate: 0, timeoutRate: 0, validationFailRate: 0, errorRate: 0 };
    }

    const count = (o: CheckoutOutcome) => recent.filter((e) => e.outcome === o).length;
    return {
      total,
      successRate: count('success') / total,
      timeoutRate: count('timeout') / total,
      validationFailRate: count('validation_fail') / total,
      errorRate: count('error') / total,
    };
  }

  /** Get Web Vital summary for a specific metric + route. */
  getVitalSummary(name: string, route: string): VitalSummary {
    const key = `${name}:${route}`;
    const values = this.getWindowValues(this.vitals, key);
    const percentiles = this.computePercentiles(values);
    return {
      name,
      route,
      count: percentiles.count,
      p50: percentiles.p50,
      p95: percentiles.p95,
      avg: percentiles.avg,
    };
  }

  /** Get all tracked endpoint names. */
  getTrackedEndpoints(): string[] {
    return Array.from(this.requests.keys());
  }

  /** Get all tracked vital keys (name:route). */
  getTrackedVitals(): string[] {
    return Array.from(this.vitals.keys());
  }

  /** Emit a structured log summary for all tracked endpoints. */
  logSummary(): void {
    for (const endpoint of this.getTrackedEndpoints()) {
      const summary = this.getEndpointSummary(endpoint);
      logger.metric('api_endpoint_summary', summary.latency.p95, {
        endpoint,
        p50: summary.latency.p50,
        p95: summary.latency.p95,
        p99: summary.latency.p99,
        max: summary.latency.max,
        avg: summary.latency.avg,
        count: summary.latency.count,
        errorRate: Math.round(summary.errorRate * 10000) / 100, // percentage
        errorCount: summary.errorCount,
      });
    }

    const checkout = this.getCheckoutSummary();
    if (checkout.total > 0) {
      logger.metric('checkout_outcome_summary', checkout.successRate * 100, {
        total: checkout.total,
        successRate: Math.round(checkout.successRate * 10000) / 100,
        timeoutRate: Math.round(checkout.timeoutRate * 10000) / 100,
        validationFailRate: Math.round(checkout.validationFailRate * 10000) / 100,
        errorRate: Math.round(checkout.errorRate * 10000) / 100,
      });
    }
  }

  /** Reset all metrics (useful for testing). */
  reset(): void {
    this.latencies.clear();
    this.errors.clear();
    this.requests.clear();
    this.checkoutOutcomes = [];
    this.vitals.clear();
  }

  // ── Internal helpers ──────────────────────────────────────

  private push(map: Map<string, TimestampedValue[]>, key: string, value: number): void {
    if (!map.has(key)) map.set(key, []);
    const arr = map.get(key)!;
    arr.push({ ts: Date.now(), value });

    // Prune old + enforce max
    if (arr.length > this.maxEntries) {
      const cutoff = Date.now() - this.windowMs;
      const pruned = arr.filter((e) => e.ts >= cutoff);
      map.set(key, pruned.length > this.maxEntries
        ? pruned.slice(-this.maxEntries)
        : pruned);
    }
  }

  private pruneArray<T extends { ts: number }>(arr: T[]): void {
    if (arr.length > this.maxEntries) {
      const cutoff = Date.now() - this.windowMs;
      const pruned = arr.filter((e) => e.ts >= cutoff);
      arr.length = 0;
      arr.push(...pruned.slice(-this.maxEntries));
    }
  }

  private getWindowValues(map: Map<string, TimestampedValue[]>, key: string): number[] {
    const arr = map.get(key);
    if (!arr) return [];
    const cutoff = Date.now() - this.windowMs;
    return arr.filter((e) => e.ts >= cutoff).map((e) => e.value);
  }

  computePercentiles(values: number[]): LatencySummary {
    if (values.length === 0) {
      return { count: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      count: len,
      p50: sorted[Math.floor(len * 0.5)]!,
      p95: sorted[Math.floor(len * 0.95)]!,
      p99: sorted[Math.floor(len * 0.99)]!,
      max: sorted[len - 1]!,
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
    };
  }
}

// ── Singleton ───────────────────────────────────────────────

export const metrics = new MetricsCollector();
