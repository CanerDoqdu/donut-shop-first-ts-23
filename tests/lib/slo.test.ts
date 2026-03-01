import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '@/lib/metrics';
import {
  evaluateCheckoutSuccess,
  evaluateCheckoutLatency,
  evaluateApiErrorRate,
  evaluateSLOs,
  ALL_SLOS,
  SLO_CHECKOUT_SUCCESS,
  SLO_CHECKOUT_P95_LATENCY,
  SLO_API_ERROR_RATE,
} from '@/lib/slo';

// ── SLO Registry ────────────────────────────────────────────

describe('SLO registry', () => {
  it('defines exactly 3 SLOs', () => {
    expect(ALL_SLOS).toHaveLength(3);
  });

  it('checkout success SLO has 95% target', () => {
    expect(SLO_CHECKOUT_SUCCESS.target).toBe(95);
    expect(SLO_CHECKOUT_SUCCESS.unit).toBe('percent');
    expect(SLO_CHECKOUT_SUCCESS.errorBudgetPercent).toBe(5);
  });

  it('checkout p95 latency SLO has 2000ms target', () => {
    expect(SLO_CHECKOUT_P95_LATENCY.target).toBe(2000);
    expect(SLO_CHECKOUT_P95_LATENCY.unit).toBe('ms');
  });

  it('API error rate SLO has 1% target', () => {
    expect(SLO_API_ERROR_RATE.target).toBe(1);
    expect(SLO_API_ERROR_RATE.unit).toBe('percent');
    expect(SLO_API_ERROR_RATE.errorBudgetPercent).toBe(1);
  });

  it('all SLOs have unique IDs', () => {
    const ids = ALL_SLOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Checkout Success SLO ────────────────────────────────────

describe('evaluateCheckoutSuccess', () => {
  it('passes when success rate ≥ 95%', () => {
    const result = evaluateCheckoutSuccess({
      total: 100,
      successRate: 0.97,
      timeoutRate: 0.01,
      validationFailRate: 0.01,
      errorRate: 0.01,
    });
    expect(result.pass).toBe(true);
    expect(result.current).toBe(97);
    expect(result.margin).toBeGreaterThan(0);
    expect(result.errorBudgetRemaining).toBeGreaterThan(0);
  });

  it('fails when success rate < 95%', () => {
    const result = evaluateCheckoutSuccess({
      total: 100,
      successRate: 0.90,
      timeoutRate: 0.05,
      validationFailRate: 0.03,
      errorRate: 0.02,
    });
    expect(result.pass).toBe(false);
    expect(result.current).toBe(90);
    expect(result.margin).toBeLessThan(0);
  });

  it('returns pass=true with insufficient data (< 5 requests)', () => {
    const result = evaluateCheckoutSuccess({
      total: 3,
      successRate: 0.33,
      timeoutRate: 0,
      validationFailRate: 0,
      errorRate: 0.67,
    });
    expect(result.pass).toBe(true);
    expect(result.message).toContain('Insufficient data');
  });

  it('handles zero total requests', () => {
    const result = evaluateCheckoutSuccess({
      total: 0,
      successRate: 0,
      timeoutRate: 0,
      validationFailRate: 0,
      errorRate: 0,
    });
    expect(result.pass).toBe(true);
    expect(result.current).toBe(100);
  });

  it('exact boundary: 95% passes', () => {
    const result = evaluateCheckoutSuccess({
      total: 100,
      successRate: 0.95,
      timeoutRate: 0.02,
      validationFailRate: 0.02,
      errorRate: 0.01,
    });
    expect(result.pass).toBe(true);
    expect(result.margin).toBe(0);
  });

  it('computes error budget remaining correctly', () => {
    // 97% success → 3% error → budget 5% → remaining 2%
    const result = evaluateCheckoutSuccess({
      total: 100,
      successRate: 0.97,
      timeoutRate: 0.01,
      validationFailRate: 0.01,
      errorRate: 0.01,
    });
    expect(result.errorBudgetRemaining).toBe(2);
  });
});

// ── Checkout p95 Latency SLO ────────────────────────────────

describe('evaluateCheckoutLatency', () => {
  it('passes when p95 ≤ 2000ms', () => {
    const result = evaluateCheckoutLatency({
      latency: { count: 50, p50: 300, p95: 1500, p99: 1800, max: 2000, avg: 400 },
      errorRate: 0.01,
      errorCount: 1,
      totalRequests: 50,
    });
    expect(result.pass).toBe(true);
    expect(result.current).toBe(1500);
    expect(result.margin).toBe(500);
  });

  it('fails when p95 > 2000ms', () => {
    const result = evaluateCheckoutLatency({
      latency: { count: 50, p50: 500, p95: 3000, p99: 4000, max: 5000, avg: 700 },
      errorRate: 0.02,
      errorCount: 1,
      totalRequests: 50,
    });
    expect(result.pass).toBe(false);
    expect(result.current).toBe(3000);
    expect(result.message).toContain('violation');
  });

  it('returns pass=true with insufficient data', () => {
    const result = evaluateCheckoutLatency({
      latency: { count: 5, p50: 300, p95: 5000, p99: 5000, max: 5000, avg: 400 },
      errorRate: 0,
      errorCount: 0,
      totalRequests: 5,
    });
    expect(result.pass).toBe(true);
    expect(result.message).toContain('Insufficient data');
  });

  it('returns pass=true when no endpoint data', () => {
    const result = evaluateCheckoutLatency(undefined);
    expect(result.pass).toBe(true);
  });

  it('errorBudgetRemaining is null for latency SLOs', () => {
    const result = evaluateCheckoutLatency({
      latency: { count: 50, p50: 300, p95: 1500, p99: 1800, max: 2000, avg: 400 },
      errorRate: 0,
      errorCount: 0,
      totalRequests: 50,
    });
    expect(result.errorBudgetRemaining).toBeNull();
  });
});

// ── API Error Rate SLO ──────────────────────────────────────

describe('evaluateApiErrorRate', () => {
  it('passes when aggregated error rate ≤ 1%', () => {
    const summaries = new Map([
      ['/api/checkout', { latency: { count: 50, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 }, errorRate: 0.005, errorCount: 0, totalRequests: 50 }],
      ['/api/reviews', { latency: { count: 30, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 }, errorRate: 0, errorCount: 0, totalRequests: 30 }],
    ]);
    const result = evaluateApiErrorRate(summaries);
    expect(result.pass).toBe(true);
    expect(result.current).toBe(0);
  });

  it('fails when aggregated error rate > 1%', () => {
    const summaries = new Map([
      ['/api/checkout', { latency: { count: 50, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 }, errorRate: 0.04, errorCount: 2, totalRequests: 50 }],
      ['/api/reviews', { latency: { count: 50, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 }, errorRate: 0.06, errorCount: 3, totalRequests: 50 }],
    ]);
    const result = evaluateApiErrorRate(summaries);
    expect(result.pass).toBe(false);
    expect(result.current).toBe(5); // 5/100 = 5%
  });

  it('returns pass=true with insufficient data', () => {
    const summaries = new Map([
      ['/api/checkout', { latency: { count: 5, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 }, errorRate: 0.5, errorCount: 3, totalRequests: 5 }],
    ]);
    const result = evaluateApiErrorRate(summaries);
    expect(result.pass).toBe(true);
    expect(result.message).toContain('Insufficient data');
  });

  it('handles empty summaries', () => {
    const result = evaluateApiErrorRate(new Map());
    expect(result.pass).toBe(true);
    expect(result.current).toBe(0);
  });
});

// ── Aggregate Evaluator ─────────────────────────────────────

describe('evaluateSLOs', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector(300_000, 10_000);
  });

  it('returns 3 SLO results', () => {
    const results = evaluateSLOs(collector);
    expect(results).toHaveLength(3);
  });

  it('all pass with no traffic (insufficient data)', () => {
    const results = evaluateSLOs(collector);
    expect(results.every((r) => r.pass)).toBe(true);
  });

  it('detects SLO violation with bad checkout success rate', () => {
    // Simulate: 20 checkouts, 15 fail
    for (let i = 0; i < 5; i++) {
      collector.recordCheckoutOutcome('success');
      collector.recordLatency('/api/checkout', 200);
    }
    for (let i = 0; i < 15; i++) {
      collector.recordCheckoutOutcome('error');
      collector.recordLatency('/api/checkout', 200);
      collector.recordError('/api/checkout');
    }

    const results = evaluateSLOs(collector);
    const checkoutSLO = results.find((r) => r.slo.id === 'slo_checkout_success');
    expect(checkoutSLO?.pass).toBe(false);
  });

  it('each result has required fields', () => {
    for (let i = 0; i < 30; i++) {
      collector.recordCheckoutOutcome('success');
      collector.recordLatency('/api/checkout', 200);
    }

    const results = evaluateSLOs(collector);
    for (const r of results) {
      expect(r.slo).toBeDefined();
      expect(typeof r.current).toBe('number');
      expect(typeof r.pass).toBe('boolean');
      expect(typeof r.margin).toBe('number');
      expect(typeof r.message).toBe('string');
    }
  });
});
