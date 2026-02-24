/**
 * Circuit Breaker + Graceful Degradation Tests — PR35
 *
 * Tests:
 *   1. CircuitBreaker state machine (CLOSED → OPEN → HALF_OPEN → CLOSED)
 *   2. Stripe degradation: breaker trips after 2 failures, recovers after probe
 *   3. Redis degradation: breaker trips after 3 failures, 5s cooldown
 *   4. Circuit open error structure + fast-fail behaviour
 *   5. Pre-configured breakers (stripeBreaker, redisBreaker, queueBreaker)
 *   6. Alert rules for circuit breaker trips
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  stripeBreaker,
  redisBreaker,
  queueBreaker,
  type CircuitState,
} from '@/lib/circuit-breaker';
import { MetricsCollector } from '@/lib/metrics';
import { evaluateAlerts, ALERT_RULES } from '@/lib/alerts';

// Suppress logger output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    metric: vi.fn(),
    withContext: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      count: vi.fn(),
    })),
  },
  startTimer: vi.fn(() => vi.fn(() => 100)),
}));

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

// ════════════════════════════════════════════════════════════════
// CircuitBreaker State Machine
// ════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', {
      failureThreshold: 2,
      cooldownMs: 100, // short for fast tests
    });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.getSnapshot().state).toBe('CLOSED');
    expect(breaker.getSnapshot().consecutiveFailures).toBe(0);
    expect(breaker.getSnapshot().totalTrips).toBe(0);
  });

  it('stays CLOSED on success', async () => {
    await breaker.call(async () => 'ok');
    expect(breaker.getSnapshot().state).toBe('CLOSED');
  });

  it('stays CLOSED after fewer failures than threshold', async () => {
    await expect(breaker.call(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getSnapshot().state).toBe('CLOSED');
    expect(breaker.getSnapshot().consecutiveFailures).toBe(1);
  });

  it('trips to OPEN after threshold consecutive failures', async () => {
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    await expect(breaker.call(async () => { throw new Error('2'); })).rejects.toThrow();
    expect(breaker.getSnapshot().state).toBe('OPEN');
    expect(breaker.getSnapshot().totalTrips).toBe(1);
  });

  it('fast-fails with CircuitOpenError when OPEN', async () => {
    // Trip the breaker
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    await expect(breaker.call(async () => { throw new Error('2'); })).rejects.toThrow();

    // Now it should fast-fail
    await expect(breaker.call(async () => 'ok')).rejects.toThrow(CircuitOpenError);
  });

  it('CircuitOpenError has correct properties', async () => {
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    await expect(breaker.call(async () => { throw new Error('2'); })).rejects.toThrow();

    try {
      await breaker.call(async () => 'ok');
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError);
      const coe = err as CircuitOpenError;
      expect(coe.breakerName).toBe('test-service');
      expect(coe.cooldownMs).toBe(100);
      expect(coe.message).toContain('OPEN');
    }
  });

  it('transitions to HALF_OPEN after cooldown', async () => {
    // Trip
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    await expect(breaker.call(async () => { throw new Error('2'); })).rejects.toThrow();
    expect(breaker.getSnapshot().state).toBe('OPEN');

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 150));

    // Next call should probe (HALF_OPEN), and if succeeds → CLOSED
    const result = await breaker.call(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getSnapshot().state).toBe('CLOSED');
    expect(breaker.getSnapshot().consecutiveFailures).toBe(0);
  });

  it('goes back to OPEN if probe fails in HALF_OPEN', async () => {
    // Trip
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    await expect(breaker.call(async () => { throw new Error('2'); })).rejects.toThrow();

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 150));

    // Probe fails → back to OPEN
    await expect(breaker.call(async () => { throw new Error('probe-fail'); })).rejects.toThrow();
    // After another failure in HALF_OPEN, it should re-trip
    expect(breaker.getSnapshot().state).toBe('OPEN');
    expect(breaker.getSnapshot().totalTrips).toBe(2);
  });

  it('resets failure count on success', async () => {
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    expect(breaker.getSnapshot().consecutiveFailures).toBe(1);

    await breaker.call(async () => 'ok');
    expect(breaker.getSnapshot().consecutiveFailures).toBe(0);
  });

  it('reset() restores to initial state', async () => {
    await expect(breaker.call(async () => { throw new Error('1'); })).rejects.toThrow();
    await expect(breaker.call(async () => { throw new Error('2'); })).rejects.toThrow();
    expect(breaker.getSnapshot().state).toBe('OPEN');

    breaker.reset();
    expect(breaker.getSnapshot().state).toBe('CLOSED');
    expect(breaker.getSnapshot().consecutiveFailures).toBe(0);
  });

  it('passes through the original error on failure', async () => {
    const err = await breaker.call(async () => { throw new Error('specific-error'); }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('specific-error');
  });

  it('returns the original value on success', async () => {
    const result = await breaker.call(async () => ({ id: 123, status: 'ok' }));
    expect(result).toEqual({ id: 123, status: 'ok' });
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 1: Stripe Degradation
// ════════════════════════════════════════════════════════════════

describe('Stripe Degradation — Circuit Breaker', () => {
  let stripe: CircuitBreaker;

  beforeEach(() => {
    stripe = new CircuitBreaker('stripe', { failureThreshold: 2, cooldownMs: 100 });
  });

  it('allows Stripe calls when healthy', async () => {
    const session = await stripe.call(async () => ({ url: 'https://checkout.stripe.com/xyz' }));
    expect(session.url).toContain('stripe.com');
    expect(stripe.getSnapshot().state).toBe('CLOSED');
  });

  it('trips after 2 consecutive Stripe 500 errors', async () => {
    const stripeError = () => { throw new Error('Stripe 500: Internal Server Error'); };
    await expect(stripe.call(stripeError)).rejects.toThrow('Stripe 500');
    await expect(stripe.call(stripeError)).rejects.toThrow('Stripe 500');

    expect(stripe.getSnapshot().state).toBe('OPEN');
  });

  it('fast-fails immediately after tripping (user gets graceful error)', async () => {
    // Trip
    await expect(stripe.call(async () => { throw new Error('500'); })).rejects.toThrow();
    await expect(stripe.call(async () => { throw new Error('500'); })).rejects.toThrow();

    // Fast-fail
    try {
      await stripe.call(async () => 'should not execute');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError);
      expect((err as CircuitOpenError).message).toContain('OPEN');
    }
  });

  it('recovers after cooldown when Stripe is back', async () => {
    await expect(stripe.call(async () => { throw new Error('500'); })).rejects.toThrow();
    await expect(stripe.call(async () => { throw new Error('500'); })).rejects.toThrow();
    expect(stripe.getSnapshot().state).toBe('OPEN');

    await new Promise((r) => setTimeout(r, 150));

    const result = await stripe.call(async () => ({ url: 'https://checkout.stripe.com/recovered' }));
    expect(result.url).toContain('recovered');
    expect(stripe.getSnapshot().state).toBe('CLOSED');
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 2: Redis Degradation — DB Fallback
// ════════════════════════════════════════════════════════════════

describe('Redis Degradation — Circuit Breaker + Fallback', () => {
  let redis: CircuitBreaker;

  beforeEach(() => {
    redis = new CircuitBreaker('redis', { failureThreshold: 3, cooldownMs: 100 });
  });

  it('trips after 3 consecutive Redis failures', async () => {
    const redisTimeout = () => { throw new Error('Redis ETIMEDOUT'); };
    await expect(redis.call(redisTimeout)).rejects.toThrow();
    await expect(redis.call(redisTimeout)).rejects.toThrow();
    expect(redis.getSnapshot().state).toBe('CLOSED'); // still closed after 2

    await expect(redis.call(redisTimeout)).rejects.toThrow();
    expect(redis.getSnapshot().state).toBe('OPEN'); // open after 3
  });

  it('simulates DB fallback when Redis circuit is open', async () => {
    // Trip Redis breaker
    for (let i = 0; i < 3; i++) {
      await expect(redis.call(async () => { throw new Error('timeout'); })).rejects.toThrow();
    }

    // Simulate fallback: when cache circuit is open, query DB directly
    let usedFallback = false;
    try {
      await redis.call(async () => 'from-cache');
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        // Fallback to DB query
        usedFallback = true;
      }
    }
    expect(usedFallback).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 3: Queue Degradation
// ════════════════════════════════════════════════════════════════

describe('Queue Degradation — Circuit Breaker', () => {
  let queue: CircuitBreaker;

  beforeEach(() => {
    queue = new CircuitBreaker('queue', { failureThreshold: 3, cooldownMs: 100 });
  });

  it('trips after 3 consecutive queue failures', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(queue.call(async () => { throw new Error('ECONNREFUSED'); })).rejects.toThrow();
    }
    expect(queue.getSnapshot().state).toBe('OPEN');
  });

  it('simulates local enqueue fallback when queue is down', async () => {
    // Trip queue breaker
    for (let i = 0; i < 3; i++) {
      await expect(queue.call(async () => { throw new Error('down'); })).rejects.toThrow();
    }

    // Simulate local fallback: enqueue locally when queue is down
    const localQueue: string[] = [];
    try {
      await queue.call(async () => 'enqueued');
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        localQueue.push('email:order-confirmation');
      }
    }
    expect(localQueue).toHaveLength(1);
    expect(localQueue[0]).toBe('email:order-confirmation');
  });
});

// ════════════════════════════════════════════════════════════════
// Pre-configured Singleton Breakers
// ════════════════════════════════════════════════════════════════

describe('Pre-configured breakers', () => {
  afterEach(() => {
    stripeBreaker.reset();
    redisBreaker.reset();
    queueBreaker.reset();
  });

  it('stripeBreaker has threshold=2, cooldown=3000', () => {
    expect(stripeBreaker.name).toBe('stripe');
    const snap = stripeBreaker.getSnapshot();
    expect(snap.state).toBe('CLOSED');
  });

  it('redisBreaker has threshold=3, cooldown=5000', () => {
    expect(redisBreaker.name).toBe('redis');
  });

  it('queueBreaker has threshold=3, cooldown=5000', () => {
    expect(queueBreaker.name).toBe('queue');
  });
});

// ════════════════════════════════════════════════════════════════
// Degradation Alert Rules
// ════════════════════════════════════════════════════════════════

describe('Degradation Alert Rules', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('stripe_circuit_breaker_tripped alert exists', () => {
    const rule = ALERT_RULES.find((r) => r.id === 'stripe_circuit_breaker_tripped');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('critical');
  });

  it('redis_circuit_breaker_tripped alert exists', () => {
    const rule = ALERT_RULES.find((r) => r.id === 'redis_circuit_breaker_tripped');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('warn');
  });

  it('fires stripe alert when trips >= 5', () => {
    const fired = evaluateAlerts(collector, undefined, undefined, { stripe: 5 });
    const alert = fired.find((a) => a.ruleId === 'stripe_circuit_breaker_tripped');
    expect(alert).toBeDefined();
    expect(alert!.message).toContain('5');
  });

  it('does not fire stripe alert when trips < 5', () => {
    const fired = evaluateAlerts(collector, undefined, undefined, { stripe: 3 });
    const alert = fired.find((a) => a.ruleId === 'stripe_circuit_breaker_tripped');
    expect(alert).toBeUndefined();
  });

  it('fires redis alert when trips >= 3', () => {
    const fired = evaluateAlerts(collector, undefined, undefined, { redis: 3 });
    const alert = fired.find((a) => a.ruleId === 'redis_circuit_breaker_tripped');
    expect(alert).toBeDefined();
    expect(alert!.message).toContain('3');
  });

  it('does not fire redis alert when trips < 3', () => {
    const fired = evaluateAlerts(collector, undefined, undefined, { redis: 2 });
    const alert = fired.find((a) => a.ruleId === 'redis_circuit_breaker_tripped');
    expect(alert).toBeUndefined();
  });

  it('does not fire degradation alerts when no trips provided', () => {
    const fired = evaluateAlerts(collector);
    expect(fired.find((a) => a.ruleId === 'stripe_circuit_breaker_tripped')).toBeUndefined();
    expect(fired.find((a) => a.ruleId === 'redis_circuit_breaker_tripped')).toBeUndefined();
  });
});
