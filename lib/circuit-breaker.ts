/**
 * Circuit Breaker — fail-fast when external services are degraded.
 *
 * States:
 *   CLOSED   → Requests flow normally. Failures are counted.
 *   OPEN     → Requests fail immediately (fast-fail). After cooldown, enter HALF_OPEN.
 *   HALF_OPEN → Allow ONE probe request. Success → CLOSED. Failure → OPEN again.
 *
 * Configuration per breaker:
 *   failureThreshold  — consecutive failures before tripping (default: 2)
 *   cooldownMs        — time in OPEN state before probing (default: 3000)
 *
 * Usage:
 *   import { CircuitBreaker } from '@/lib/circuit-breaker';
 *
 *   const stripe = new CircuitBreaker('stripe', { failureThreshold: 2, cooldownMs: 3000 });
 *
 *   const result = await stripe.call(() => createCheckoutSession(params));
 *   // Throws CircuitOpenError if breaker is open.
 *
 * Monitoring:
 *   All state transitions are logged via the structured logger.
 *   Fired alerts can be integrated via lib/alerts.ts.
 */

import { logger } from './logger';

// ── Types ───────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Consecutive failures before tripping the breaker. */
  failureThreshold?: number;
  /** Time in ms the breaker stays OPEN before allowing a probe. */
  cooldownMs?: number;
}

export interface CircuitBreakerSnapshot {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  totalTrips: number;
}

export class CircuitOpenError extends Error {
  public readonly breakerName: string;
  public readonly cooldownMs: number;

  constructor(breakerName: string, cooldownMs: number) {
    super(`Circuit breaker "${breakerName}" is OPEN — request rejected. Retry after ${cooldownMs}ms.`);
    this.name = 'CircuitOpenError';
    this.breakerName = breakerName;
    this.cooldownMs = cooldownMs;
  }
}

// ── Circuit Breaker Implementation ──────────────────────────

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private totalTrips = 0;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 2;
    this.cooldownMs = options.cooldownMs ?? 3000;
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws CircuitOpenError if the breaker is OPEN and cooldown hasn't elapsed.
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldProbe()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitOpenError(this.name, this.cooldownMs);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Record a success: reset failure count, close the breaker. */
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      logger.info('circuit_breaker.recovered', {
        breaker: this.name,
        previousTrips: this.totalTrips,
      });
    }
    this.consecutiveFailures = 0;
    this.transitionTo('CLOSED');
  }

  /** Record a failure: increment count, potentially trip the breaker. */
  private onFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.trip();
    }
  }

  /** Trip the breaker to OPEN state. */
  private trip(): void {
    if (this.state !== 'OPEN') {
      this.totalTrips++;
      this.transitionTo('OPEN');

      logger.warn('circuit_breaker.tripped', {
        breaker: this.name,
        consecutiveFailures: this.consecutiveFailures,
        totalTrips: this.totalTrips,
        cooldownMs: this.cooldownMs,
      });
    }
  }

  /** Check if enough time has passed for a half-open probe. */
  private shouldProbe(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.cooldownMs;
  }

  /** Transition to a new state. */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;

      logger.info('circuit_breaker.transition', {
        breaker: this.name,
        from: oldState,
        to: newState,
      });
    }
  }

  /** Get a snapshot of the breaker's current state (for monitoring/testing). */
  getSnapshot(): CircuitBreakerSnapshot {
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      totalTrips: this.totalTrips,
    };
  }

  /** Force-reset the breaker to CLOSED (for testing). */
  reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
  }
}

// ── Pre-configured Breakers ─────────────────────────────────

/** Stripe: fail-fast after 2 consecutive 500s, 3s cooldown. */
export const stripeBreaker = new CircuitBreaker('stripe', {
  failureThreshold: 2,
  cooldownMs: 3000,
});

/** Redis: fail-fast after 3 consecutive failures, 5s cooldown. */
export const redisBreaker = new CircuitBreaker('redis', {
  failureThreshold: 3,
  cooldownMs: 5000,
});

/** BullMQ: fail-fast after 3 consecutive failures, 5s cooldown. */
export const queueBreaker = new CircuitBreaker('queue', {
  failureThreshold: 3,
  cooldownMs: 5000,
});
