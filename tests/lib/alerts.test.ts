import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector } from '@/lib/metrics';
import {
  evaluateAlerts,
  buildAlertContext,
  ALERT_RULES,
  type AlertContext,
  type FiredAlert,
} from '@/lib/alerts';

// Mock Sentry to avoid real captures during tests
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => {
    cb({
      setTag: vi.fn(),
      setLevel: vi.fn(),
      setExtras: vi.fn(),
    });
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('Alert Thresholds', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  // ── Rule: checkout_p99_latency ────────────────────────────

  describe('checkout_p99_latency', () => {
    it('does not fire when checkout p99 < 10s', () => {
      // Record 100 checkout requests all under 5s
      for (let i = 0; i < 100; i++) {
        collector.recordLatency('/api/checkout', 3000 + Math.random() * 2000);
      }
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_p99_latency');
      expect(alert).toBeUndefined();
    });

    it('fires when checkout p99 > 10s', () => {
      // Record 99 fast requests + 1 slow one (p99 will be the slow one)
      for (let i = 0; i < 99; i++) {
        collector.recordLatency('/api/checkout', 500);
      }
      // The 100th request pushes p99 above threshold
      for (let i = 0; i < 5; i++) {
        collector.recordLatency('/api/checkout', 15_000);
      }

      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_p99_latency');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('warn');
      expect(alert!.message).toContain('Checkout p99 latency');
    });

    it('does not fire when no checkout data exists', () => {
      collector.recordLatency('/api/products', 500);
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_p99_latency');
      expect(alert).toBeUndefined();
    });
  });

  // ── Rule: api_error_rate_critical ─────────────────────────

  describe('api_error_rate_critical', () => {
    it('does not fire when error rate < 5%', () => {
      for (let i = 0; i < 100; i++) {
        collector.recordLatency('/api/checkout', 200);
      }
      // 4 errors out of 100 = 4%
      for (let i = 0; i < 4; i++) {
        collector.recordError('/api/checkout');
      }
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'api_error_rate_critical');
      expect(alert).toBeUndefined();
    });

    it('fires when error rate > 5%', () => {
      for (let i = 0; i < 20; i++) {
        collector.recordLatency('/api/checkout', 200);
      }
      // 2 errors out of 20 = 10%
      for (let i = 0; i < 2; i++) {
        collector.recordError('/api/checkout');
      }
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'api_error_rate_critical');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
    });

    it('ignores endpoints with < 10 requests (not statistically significant)', () => {
      // Only 5 requests, 100% error rate
      for (let i = 0; i < 5; i++) {
        collector.recordLatency('/api/test', 200);
      }
      for (let i = 0; i < 5; i++) {
        collector.recordError('/api/test');
      }
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'api_error_rate_critical');
      expect(alert).toBeUndefined();
    });
  });

  // ── Rule: checkout_success_rate_low ───────────────────────

  describe('checkout_success_rate_low', () => {
    it('does not fire when success rate ≥ 90%', () => {
      for (let i = 0; i < 9; i++) collector.recordCheckoutOutcome('success');
      collector.recordCheckoutOutcome('error');
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_success_rate_low');
      expect(alert).toBeUndefined();
    });

    it('fires when success rate < 90%', () => {
      for (let i = 0; i < 8; i++) collector.recordCheckoutOutcome('success');
      for (let i = 0; i < 3; i++) collector.recordCheckoutOutcome('error');
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_success_rate_low');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
    });

    it('ignores when < 10 checkout attempts', () => {
      for (let i = 0; i < 3; i++) collector.recordCheckoutOutcome('error');
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_success_rate_low');
      expect(alert).toBeUndefined();
    });
  });

  // ── Rule: checkout_timeout_rate_high ──────────────────────

  describe('checkout_timeout_rate_high', () => {
    it('does not fire when timeout rate ≤ 10%', () => {
      for (let i = 0; i < 9; i++) collector.recordCheckoutOutcome('success');
      collector.recordCheckoutOutcome('timeout');
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_timeout_rate_high');
      expect(alert).toBeUndefined();
    });

    it('fires when timeout rate > 10%', () => {
      for (let i = 0; i < 8; i++) collector.recordCheckoutOutcome('success');
      for (let i = 0; i < 3; i++) collector.recordCheckoutOutcome('timeout');
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_timeout_rate_high');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('warn');
    });
  });

  // ── Rule: memory_growth_high ──────────────────────────────

  describe('memory_growth_high', () => {
    it('does not fire when memory < 512MB', () => {
      const fired = evaluateAlerts(collector, 256);
      const alert = fired.find((a) => a.ruleId === 'memory_growth_high');
      expect(alert).toBeUndefined();
    });

    it('fires when memory > 512MB', () => {
      const fired = evaluateAlerts(collector, 600);
      const alert = fired.find((a) => a.ruleId === 'memory_growth_high');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('warn');
      expect(alert!.message).toContain('600');
    });

    it('does not fire when memory is undefined', () => {
      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'memory_growth_high');
      expect(alert).toBeUndefined();
    });
  });

  // ── FiredAlert shape ──────────────────────────────────────

  describe('FiredAlert structure', () => {
    it('includes all required fields', () => {
      for (let i = 0; i < 5; i++) collector.recordCheckoutOutcome('error');
      for (let i = 0; i < 6; i++) collector.recordCheckoutOutcome('success');

      const fired = evaluateAlerts(collector);
      const alert = fired.find((a) => a.ruleId === 'checkout_success_rate_low');
      expect(alert).toBeDefined();
      expect(alert).toHaveProperty('ruleId');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('domain');
      expect(alert).toHaveProperty('timestamp');
      expect(new Date(alert!.timestamp).toISOString()).toBe(alert!.timestamp);
    });
  });

  // ── evaluateAlerts returns no alerts when clean ───────────

  describe('clean state', () => {
    it('returns empty array when no metrics recorded', () => {
      const fired = evaluateAlerts(collector);
      expect(fired).toEqual([]);
    });

    it('returns empty array when all metrics healthy', () => {
      for (let i = 0; i < 20; i++) {
        collector.recordLatency('/api/checkout', 200);
        collector.recordCheckoutOutcome('success');
      }
      const fired = evaluateAlerts(collector, 128);
      expect(fired).toEqual([]);
    });
  });

  // ── buildAlertContext ─────────────────────────────────────

  describe('buildAlertContext', () => {
    it('builds context with endpoint summaries', () => {
      collector.recordLatency('/api/checkout', 100);
      collector.recordCheckoutOutcome('success');

      const ctx = buildAlertContext(collector, 200);
      expect(ctx.endpointSummaries.has('/api/checkout')).toBe(true);
      expect(ctx.checkoutSummary.total).toBe(1);
      expect(ctx.memoryUsageMB).toBe(200);
    });
  });

  // ── ALERT_RULES integrity ────────────────────────────────

  describe('ALERT_RULES', () => {
    it('has unique rule IDs', () => {
      const ids = ALERT_RULES.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all rules have required properties', () => {
      for (const rule of ALERT_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.description).toBeTruthy();
        expect(['warn', 'critical']).toContain(rule.severity);
        expect(typeof rule.evaluate).toBe('function');
        expect(typeof rule.message).toBe('function');
      }
    });
  });

  // ── Multiple alerts fire simultaneously ───────────────────

  describe('multiple alerts', () => {
    it('can fire multiple alerts at once', () => {
      // Trigger high error rate
      for (let i = 0; i < 20; i++) {
        collector.recordLatency('/api/checkout', 200);
      }
      for (let i = 0; i < 5; i++) {
        collector.recordError('/api/checkout');
      }
      // Trigger low checkout success rate
      for (let i = 0; i < 5; i++) collector.recordCheckoutOutcome('error');
      for (let i = 0; i < 6; i++) collector.recordCheckoutOutcome('success');

      // Trigger high memory
      const fired = evaluateAlerts(collector, 700);
      const ruleIds = fired.map((a) => a.ruleId);

      expect(ruleIds).toContain('api_error_rate_critical');
      expect(ruleIds).toContain('checkout_success_rate_low');
      expect(ruleIds).toContain('memory_growth_high');
    });
  });
});
