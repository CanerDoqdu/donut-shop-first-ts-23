import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector } from '@/lib/metrics';
import type { CheckoutOutcome } from '@/lib/metrics';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  // ── Latency Recording ────────────────────────────────────

  describe('recordLatency + getLatencySummary', () => {
    it('returns zeros when no data recorded', () => {
      const summary = collector.getLatencySummary('/api/checkout');
      expect(summary).toEqual({ count: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 });
    });

    it('computes percentiles for single data point', () => {
      collector.recordLatency('/api/checkout', 200);
      const s = collector.getLatencySummary('/api/checkout');
      expect(s.count).toBe(1);
      expect(s.p50).toBe(200);
      expect(s.max).toBe(200);
      expect(s.avg).toBe(200);
    });

    it('computes correct p50, p95, p99 for multiple data points', () => {
      // Record 100 latencies: 1, 2, 3, ..., 100
      for (let i = 1; i <= 100; i++) {
        collector.recordLatency('/api/products', i);
      }
      const s = collector.getLatencySummary('/api/products');
      expect(s.count).toBe(100);
      expect(s.p50).toBe(51); // floor(100*0.5) = index 50 → value 51
      expect(s.p95).toBe(96); // floor(100*0.95) = index 95 → value 96
      expect(s.p99).toBe(100); // floor(100*0.99) = index 99 → value 100
      expect(s.max).toBe(100);
      expect(s.avg).toBe(51); // Math.round((1+100)*100/2/100) = 50.5 → 51
    });

    it('isolates latencies per endpoint', () => {
      collector.recordLatency('/api/checkout', 500);
      collector.recordLatency('/api/products', 50);

      expect(collector.getLatencySummary('/api/checkout').p50).toBe(500);
      expect(collector.getLatencySummary('/api/products').p50).toBe(50);
    });
  });

  // ── Error Recording ──────────────────────────────────────

  describe('recordError + getEndpointSummary', () => {
    it('tracks error rate correctly', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordLatency('/api/checkout', 100);
      }
      collector.recordError('/api/checkout', 'E_STRIPE_FAILED');
      collector.recordError('/api/checkout', 'E_DB_FAILED');

      const summary = collector.getEndpointSummary('/api/checkout');
      expect(summary.errorCount).toBe(2);
      expect(summary.totalRequests).toBe(10);
      expect(summary.errorRate).toBeCloseTo(0.2);
    });

    it('returns 0 error rate when no errors', () => {
      collector.recordLatency('/api/products', 50);
      const summary = collector.getEndpointSummary('/api/products');
      expect(summary.errorRate).toBe(0);
      expect(summary.errorCount).toBe(0);
    });

    it('returns 0 error rate when no requests', () => {
      const summary = collector.getEndpointSummary('/api/unknown');
      expect(summary.errorRate).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });
  });

  // ── Checkout Outcomes ────────────────────────────────────

  describe('recordCheckoutOutcome + getCheckoutSummary', () => {
    it('returns zeros when no outcomes recorded', () => {
      const summary = collector.getCheckoutSummary();
      expect(summary).toEqual({
        total: 0,
        successRate: 0,
        timeoutRate: 0,
        validationFailRate: 0,
        errorRate: 0,
      });
    });

    it('computes correct outcome rates', () => {
      const outcomes: CheckoutOutcome[] = [
        'success', 'success', 'success', 'success', 'success',
        'success', 'success', 'timeout', 'validation_fail', 'error',
      ];
      for (const o of outcomes) {
        collector.recordCheckoutOutcome(o);
      }

      const s = collector.getCheckoutSummary();
      expect(s.total).toBe(10);
      expect(s.successRate).toBeCloseTo(0.7);
      expect(s.timeoutRate).toBeCloseTo(0.1);
      expect(s.validationFailRate).toBeCloseTo(0.1);
      expect(s.errorRate).toBeCloseTo(0.1);
    });

    it('handles 100% success rate', () => {
      for (let i = 0; i < 5; i++) collector.recordCheckoutOutcome('success');
      const s = collector.getCheckoutSummary();
      expect(s.successRate).toBe(1);
      expect(s.timeoutRate).toBe(0);
    });
  });

  // ── Web Vitals ───────────────────────────────────────────

  describe('recordWebVital + getVitalSummary', () => {
    it('returns zeros for untracked vital', () => {
      const s = collector.getVitalSummary('LCP', '/en');
      expect(s.count).toBe(0);
      expect(s.p50).toBe(0);
    });

    it('records and summarises vitals per name:route', () => {
      collector.recordWebVital('LCP', 2000, '/en');
      collector.recordWebVital('LCP', 3000, '/en');
      collector.recordWebVital('LCP', 1000, '/en');
      collector.recordWebVital('LCP', 1500, '/tr/checkout');

      const home = collector.getVitalSummary('LCP', '/en');
      expect(home.count).toBe(3);
      expect(home.name).toBe('LCP');
      expect(home.route).toBe('/en');

      const checkout = collector.getVitalSummary('LCP', '/tr/checkout');
      expect(checkout.count).toBe(1);
      expect(checkout.p50).toBe(1500);
    });
  });

  // ── Sliding Window ───────────────────────────────────────

  describe('sliding window expiry', () => {
    it('excludes data points outside the window', () => {
      // Use a very short window (100ms)
      const short = new MetricsCollector(100);

      // Record a data point
      short.recordLatency('/api/test', 500);
      expect(short.getLatencySummary('/api/test').count).toBe(1);

      // Fast-forward time past the window
      vi.useFakeTimers();
      vi.advanceTimersByTime(200);

      // Should be expired
      expect(short.getLatencySummary('/api/test').count).toBe(0);

      vi.useRealTimers();
    });
  });

  // ── Tracking Endpoints ───────────────────────────────────

  describe('getTrackedEndpoints', () => {
    it('returns all endpoints that have recorded latency', () => {
      collector.recordLatency('/api/checkout', 100);
      collector.recordLatency('/api/products', 200);

      const endpoints = collector.getTrackedEndpoints();
      expect(endpoints).toContain('/api/checkout');
      expect(endpoints).toContain('/api/products');
      expect(endpoints).toHaveLength(2);
    });
  });

  describe('getTrackedVitals', () => {
    it('returns all vital keys', () => {
      collector.recordWebVital('LCP', 2000, '/en');
      collector.recordWebVital('CLS', 0.05, '/en');

      const keys = collector.getTrackedVitals();
      expect(keys).toContain('LCP:/en');
      expect(keys).toContain('CLS:/en');
    });
  });

  // ── Reset ────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all metrics', () => {
      collector.recordLatency('/api/checkout', 100);
      collector.recordError('/api/checkout');
      collector.recordCheckoutOutcome('success');
      collector.recordWebVital('LCP', 2000, '/en');

      collector.reset();

      expect(collector.getTrackedEndpoints()).toHaveLength(0);
      expect(collector.getCheckoutSummary().total).toBe(0);
      expect(collector.getTrackedVitals()).toHaveLength(0);
    });
  });

  // ── logSummary ───────────────────────────────────────────

  describe('logSummary', () => {
    it('does not throw when called with data', () => {
      collector.recordLatency('/api/checkout', 100);
      collector.recordCheckoutOutcome('success');
      expect(() => collector.logSummary()).not.toThrow();
    });

    it('does not throw when called with empty data', () => {
      expect(() => collector.logSummary()).not.toThrow();
    });
  });

  // ── computePercentiles edge cases ────────────────────────

  describe('computePercentiles', () => {
    it('handles empty array', () => {
      const result = collector.computePercentiles([]);
      expect(result).toEqual({ count: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 });
    });

    it('handles single value', () => {
      const result = collector.computePercentiles([42]);
      expect(result.count).toBe(1);
      expect(result.p50).toBe(42);
      expect(result.max).toBe(42);
      expect(result.avg).toBe(42);
    });

    it('handles two values', () => {
      const result = collector.computePercentiles([10, 90]);
      expect(result.count).toBe(2);
      expect(result.max).toBe(90);
      expect(result.avg).toBe(50);
    });
  });

  // ── Pruning / overflow ───────────────────────────────────

  describe('push overflow pruning', () => {
    it('prunes latency entries when exceeding maxEntries', () => {
      // Use a tiny maxEntries to trigger pruning
      const small = new MetricsCollector(60_000, 5);
      for (let i = 0; i < 8; i++) {
        small.recordLatency('/api/test', i * 10);
      }
      // After pruning, should have at most 5 entries
      const summary = small.getLatencySummary('/api/test');
      expect(summary.count).toBeLessThanOrEqual(5);
    });

    it('prunes checkout outcomes when exceeding maxEntries', () => {
      const small = new MetricsCollector(60_000, 5);
      for (let i = 0; i < 8; i++) {
        small.recordCheckoutOutcome('success');
      }
      // After pruning, total should be capped
      const summary = small.getCheckoutSummary();
      expect(summary.total).toBeLessThanOrEqual(5);
    });

    it('retains only recent entries after pruning (push path)', () => {
      const small = new MetricsCollector(60_000, 3);
      // Push 5 latency entries — triggers pruning at > 3
      for (let i = 1; i <= 5; i++) {
        small.recordLatency('/api/x', i * 100);
      }
      const s = small.getLatencySummary('/api/x');
      expect(s.count).toBeLessThanOrEqual(3);
    });
  });
});
