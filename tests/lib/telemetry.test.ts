import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryCollector, TELEMETRY_EVENTS } from '@/lib/telemetry';
import { metrics } from '@/lib/metrics';

// Mock logger to avoid console output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    metric: vi.fn(),
    count: vi.fn(),
    withContext: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

describe('TelemetryCollector', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = new TelemetryCollector();
    metrics.reset();
  });

  // ── Event tracking ──────────────────────────────────────

  describe('track', () => {
    it('records a product_view event', () => {
      collector.track('product_view', { productId: 'p-1' });
      const events = collector.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('product_view');
      expect(events[0].payload).toEqual({ productId: 'p-1' });
    });

    it('records multiple event types in sequence', () => {
      collector.track('product_view', { productId: 'p-1' });
      collector.track('add_to_cart', { productId: 'p-1', quantity: 2 });
      collector.track('checkout_started', { cartSize: 1, cartTotal: 10 });
      collector.track('checkout_success', { orderId: 'o-1', total: 10 });

      const events = collector.getRecentEvents();
      expect(events).toHaveLength(4);
      expect(events.map((e) => e.name)).toEqual([
        'product_view',
        'add_to_cart',
        'checkout_started',
        'checkout_success',
      ]);
    });

    it('records checkout_failed event', () => {
      collector.track('checkout_failed', { error: 'E_STRIPE', step: 'payment' });
      const events = collector.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual({ error: 'E_STRIPE', step: 'payment' });
    });

    it('includes timestamp on events', () => {
      const before = Date.now();
      collector.track('product_view', { productId: 'p-1' });
      const after = Date.now();

      const events = collector.getRecentEvents();
      expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ── Event type validation ─────────────────────────────

  describe('TELEMETRY_EVENTS', () => {
    it('contains exactly the 5 funnel events', () => {
      expect(TELEMETRY_EVENTS).toEqual([
        'product_view',
        'add_to_cart',
        'checkout_started',
        'checkout_success',
        'checkout_failed',
      ]);
    });
  });

  // ── Funnel metrics ────────────────────────────────────

  describe('getFunnelMetrics', () => {
    it('returns zero counts when no events', () => {
      const funnel = collector.getFunnelMetrics();
      expect(funnel.counts.product_view).toBe(0);
      expect(funnel.counts.add_to_cart).toBe(0);
      expect(funnel.counts.checkout_started).toBe(0);
      expect(funnel.counts.checkout_success).toBe(0);
      expect(funnel.counts.checkout_failed).toBe(0);
    });

    it('returns 0 conversion rates when no views', () => {
      const funnel = collector.getFunnelMetrics();
      expect(funnel.conversionRates.viewToCart).toBe(0);
      expect(funnel.conversionRates.cartToCheckoutStart).toBe(0);
      expect(funnel.conversionRates.checkoutStartToSuccess).toBe(0);
      expect(funnel.conversionRates.overallConversion).toBe(0);
    });

    it('computes correct funnel counts', () => {
      collector.track('product_view', { productId: 'p-1' });
      collector.track('product_view', { productId: 'p-2' });
      collector.track('add_to_cart', { productId: 'p-1', quantity: 1 });
      collector.track('checkout_started', { cartSize: 1, cartTotal: 5 });
      collector.track('checkout_success', { orderId: 'o-1', total: 5 });

      const funnel = collector.getFunnelMetrics();
      expect(funnel.counts.product_view).toBe(2);
      expect(funnel.counts.add_to_cart).toBe(1);
      expect(funnel.counts.checkout_started).toBe(1);
      expect(funnel.counts.checkout_success).toBe(1);
      expect(funnel.counts.checkout_failed).toBe(0);
    });

    it('computes correct conversion rates', () => {
      // 100 views, 50 add_to_cart, 25 checkout_started, 20 checkout_success
      for (let i = 0; i < 100; i++) collector.track('product_view', { productId: `p-${i}` });
      for (let i = 0; i < 50; i++) collector.track('add_to_cart', { productId: `p-${i}`, quantity: 1 });
      for (let i = 0; i < 25; i++) collector.track('checkout_started', { cartSize: 1, cartTotal: 10 });
      for (let i = 0; i < 20; i++) collector.track('checkout_success', { orderId: `o-${i}`, total: 10 });
      for (let i = 0; i < 5; i++) collector.track('checkout_failed', { error: 'E_TEST' });

      const funnel = collector.getFunnelMetrics();

      expect(funnel.conversionRates.viewToCart).toBeCloseTo(0.5, 2);           // 50/100
      expect(funnel.conversionRates.cartToCheckoutStart).toBeCloseTo(0.5, 2);  // 25/50
      expect(funnel.conversionRates.checkoutStartToSuccess).toBeCloseTo(0.8, 2); // 20/25
      expect(funnel.conversionRates.overallConversion).toBeCloseTo(0.2, 2);    // 20/100
    });

    it('handles 100% conversion funnel', () => {
      collector.track('product_view', { productId: 'p-1' });
      collector.track('add_to_cart', { productId: 'p-1', quantity: 1 });
      collector.track('checkout_started', { cartSize: 1, cartTotal: 5 });
      collector.track('checkout_success', { orderId: 'o-1', total: 5 });

      const funnel = collector.getFunnelMetrics();
      expect(funnel.conversionRates.viewToCart).toBe(1);
      expect(funnel.conversionRates.cartToCheckoutStart).toBe(1);
      expect(funnel.conversionRates.checkoutStartToSuccess).toBe(1);
      expect(funnel.conversionRates.overallConversion).toBe(1);
    });
  });

  // ── Guardrail metrics ─────────────────────────────────

  describe('getGuardrailMetrics', () => {
    it('returns 0 error rate when no checkouts', () => {
      const g = collector.getGuardrailMetrics();
      expect(g.checkoutErrorRate).toBe(0);
    });

    it('returns OK status when no data', () => {
      const g = collector.getGuardrailMetrics();
      expect(g.status.checkoutErrorRateOk).toBe(true);
      expect(g.status.apiLatencyOk).toBe(true);
    });

    it('computes checkout error rate correctly', () => {
      for (let i = 0; i < 90; i++) {
        collector.track('checkout_success', { orderId: `o-${i}`, total: 10 });
      }
      for (let i = 0; i < 10; i++) {
        collector.track('checkout_failed', { error: 'E_TEST' });
      }

      const g = collector.getGuardrailMetrics();
      expect(g.checkoutErrorRate).toBeCloseTo(0.1, 2); // 10/100 = 10%
      expect(g.status.checkoutErrorRateOk).toBe(false); // 10% > 5%
    });

    it('marks checkout error rate OK when below threshold', () => {
      for (let i = 0; i < 98; i++) {
        collector.track('checkout_success', { orderId: `o-${i}`, total: 10 });
      }
      for (let i = 0; i < 2; i++) {
        collector.track('checkout_failed', { error: 'E_TEST' });
      }

      const g = collector.getGuardrailMetrics();
      expect(g.checkoutErrorRate).toBeCloseTo(0.02, 2); // 2%
      expect(g.status.checkoutErrorRateOk).toBe(true);
    });

    it('reads API latency from MetricsCollector', () => {
      // Simulate latency recordings in MetricsCollector
      for (let i = 0; i < 100; i++) {
        metrics.recordLatency('/api/checkout', 100 + i);
      }

      const g = collector.getGuardrailMetrics();
      expect(g.apiLatencyP95).toBeGreaterThan(0);
      expect(g.status.apiLatencyOk).toBe(true); // ~195ms < 2000ms
    });

    it('flags API latency breach', () => {
      // Push a lot of high-latency values
      for (let i = 0; i < 100; i++) {
        metrics.recordLatency('/api/checkout', 3000);
      }

      const g = collector.getGuardrailMetrics();
      expect(g.apiLatencyP95).toBeGreaterThanOrEqual(2000);
      expect(g.status.apiLatencyOk).toBe(false);
    });
  });

  // ── Reset ─────────────────────────────────────────────

  describe('reset', () => {
    it('clears all events', () => {
      collector.track('product_view', { productId: 'p-1' });
      collector.track('add_to_cart', { productId: 'p-1', quantity: 1 });
      expect(collector.getRecentEvents()).toHaveLength(2);

      collector.reset();
      expect(collector.getRecentEvents()).toHaveLength(0);
    });
  });

  // ── Window pruning ────────────────────────────────────

  describe('windowing', () => {
    it('prunes events outside window', () => {
      // Use a very short window for testing
      const shortCollector = new TelemetryCollector(100); // 100ms window

      shortCollector.track('product_view', { productId: 'p-1' });

      // Manually push an old event
      (shortCollector as unknown as { events: Array<{ name: string; payload: unknown; timestamp: number }> })
        .events.push({
          name: 'product_view',
          payload: { productId: 'old' },
          timestamp: Date.now() - 200, // 200ms ago — outside 100ms window
        });

      const recent = shortCollector.getRecentEvents();
      expect(recent).toHaveLength(1);
      expect((recent[0].payload as { productId: string }).productId).toBe('p-1');
    });
  });
});
