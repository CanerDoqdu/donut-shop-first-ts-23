/**
 * Alert Threshold Definitions — evaluated in-code.
 *
 * Instead of relying solely on Sentry UI or Grafana alerts,
 * we define alert rules in code for:
 *  1. Version control of alert thresholds
 *  2. Testability
 *  3. Consistent evaluation across environments
 *
 * Each rule has a threshold, severity, and evaluation function.
 * When a threshold is breached, a structured log + Sentry event is emitted.
 *
 * Usage:
 *   import { evaluateAlerts } from '@/lib/alerts';
 *   evaluateAlerts(metrics); // checks all rules against current metrics
 */

import { logger } from './logger';
import { captureWithContext, type SentryDomain } from './sentry';
import type { MetricsCollector, EndpointSummary, CheckoutSummary } from './metrics';
import type { VitalRegression } from './perf-budget';

// ── Types ───────────────────────────────────────────────────

export type AlertSeverity = 'warn' | 'critical';

export interface AlertRule {
  /** Unique identifier for the rule (e.g., 'checkout_p99_latency'). */
  id: string;
  /** Human-readable description. */
  description: string;
  /** Alert severity: warn or critical. */
  severity: AlertSeverity;
  /** Sentry domain for tagging. */
  domain: SentryDomain;
  /** Evaluate: returns true if threshold is breached. */
  evaluate: (ctx: AlertContext) => boolean;
  /** Formatted message when alert fires. */
  message: (ctx: AlertContext) => string;
}

export interface AlertContext {
  endpointSummaries: Map<string, EndpointSummary>;
  checkoutSummary: CheckoutSummary;
  /** Current process memory usage in MB. */
  memoryUsageMB?: number;
  /** Web Vital regressions detected by perf-budget, if available. */
  vitalRegressions?: VitalRegression[];
}

export interface FiredAlert {
  ruleId: string;
  severity: AlertSeverity;
  message: string;
  domain: SentryDomain;
  timestamp: string;
}

// ── Alert Rule Definitions ──────────────────────────────────

export const ALERT_RULES: AlertRule[] = [
  {
    id: 'checkout_p99_latency',
    description: 'Checkout p99 latency > 10s',
    severity: 'warn',
    domain: 'checkout',
    evaluate: (ctx) => {
      const checkout = ctx.endpointSummaries.get('/api/checkout');
      return !!checkout && checkout.latency.p99 > 10_000;
    },
    message: (ctx) => {
      const p99 = ctx.endpointSummaries.get('/api/checkout')?.latency.p99 ?? 0;
      return `Checkout p99 latency is ${Math.round(p99)}ms (threshold: 10000ms)`;
    },
  },
  {
    id: 'api_error_rate_critical',
    description: 'Any API endpoint error rate > 5%',
    severity: 'critical',
    domain: 'checkout',
    evaluate: (ctx) => {
      for (const [, summary] of ctx.endpointSummaries) {
        if (summary.totalRequests >= 10 && summary.errorRate > 0.05) return true;
      }
      return false;
    },
    message: (ctx) => {
      const entries: string[] = [];
      for (const [ep, summary] of ctx.endpointSummaries) {
        if (summary.totalRequests >= 10 && summary.errorRate > 0.05) {
          entries.push(`${ep}: ${(summary.errorRate * 100).toFixed(1)}%`);
        }
      }
      return `Error rate > 5% on: ${entries.join(', ')}`;
    },
  },
  {
    id: 'checkout_success_rate_low',
    description: 'Checkout success rate < 90%',
    severity: 'critical',
    domain: 'checkout',
    evaluate: (ctx) =>
      ctx.checkoutSummary.total >= 10 && ctx.checkoutSummary.successRate < 0.9,
    message: (ctx) =>
      `Checkout success rate is ${(ctx.checkoutSummary.successRate * 100).toFixed(1)}% (threshold: 90%)`,
  },
  {
    id: 'checkout_timeout_rate_high',
    description: 'Checkout timeout rate > 10%',
    severity: 'warn',
    domain: 'checkout',
    evaluate: (ctx) =>
      ctx.checkoutSummary.total >= 10 && ctx.checkoutSummary.timeoutRate > 0.1,
    message: (ctx) =>
      `Checkout timeout rate is ${(ctx.checkoutSummary.timeoutRate * 100).toFixed(1)}% (threshold: 10%)`,
  },
  {
    id: 'memory_growth_high',
    description: 'Memory usage > 512MB',
    severity: 'warn',
    domain: 'queue',
    evaluate: (ctx) => !!ctx.memoryUsageMB && ctx.memoryUsageMB > 512,
    message: (ctx) =>
      `Memory usage is ${ctx.memoryUsageMB?.toFixed(0) ?? '?'}MB (threshold: 512MB)`,
  },
  {
    id: 'vital_fcp_regression',
    description: 'FCP regression > 5%',
    severity: 'warn',
    domain: 'checkout',
    evaluate: (ctx) =>
      !!ctx.vitalRegressions?.some((r) => r.name === 'FCP'),
    message: (ctx) => {
      const r = ctx.vitalRegressions?.find((v) => v.name === 'FCP');
      return r?.message ?? 'FCP regression detected';
    },
  },
  {
    id: 'vital_lcp_regression',
    description: 'LCP regression > 3%',
    severity: 'critical',
    domain: 'checkout',
    evaluate: (ctx) =>
      !!ctx.vitalRegressions?.some((r) => r.name === 'LCP'),
    message: (ctx) => {
      const r = ctx.vitalRegressions?.find((v) => v.name === 'LCP');
      return r?.message ?? 'LCP regression detected';
    },
  },
];

// ── Evaluation Engine ───────────────────────────────────────

/**
 * Evaluate all alert rules against current metrics.
 *
 * @param collector - The MetricsCollector instance
 * @param memoryUsageMB - Optional: current process memory in MB
 * @returns Array of fired alerts
 */
export function evaluateAlerts(
  collector: MetricsCollector,
  memoryUsageMB?: number,
  vitalRegressions?: VitalRegression[],
): FiredAlert[] {
  // Build context
  const endpointSummaries = new Map<string, EndpointSummary>();
  for (const endpoint of collector.getTrackedEndpoints()) {
    endpointSummaries.set(endpoint, collector.getEndpointSummary(endpoint));
  }

  const ctx: AlertContext = {
    endpointSummaries,
    checkoutSummary: collector.getCheckoutSummary(),
    memoryUsageMB,
    vitalRegressions,
  };

  const fired: FiredAlert[] = [];

  for (const rule of ALERT_RULES) {
    try {
      if (rule.evaluate(ctx)) {
        const alert: FiredAlert = {
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.message(ctx),
          domain: rule.domain,
          timestamp: new Date().toISOString(),
        };
        fired.push(alert);

        // Emit structured log
        const logLevel = rule.severity === 'critical' ? 'error' : 'warn';
        logger[logLevel](`alert.${rule.id}`, {
          alertId: rule.id,
          severity: rule.severity,
          message: alert.message,
          domain: rule.domain,
        });

        // Capture to Sentry (non-fatal)
        captureWithContext(
          new Error(alert.message),
          rule.domain,
          { alertId: rule.id, severity: rule.severity },
          rule.severity === 'critical' ? 'error' : 'warning',
        );
      }
    } catch (err) {
      logger.warn('alert.evaluation_error', {
        ruleId: rule.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return fired;
}

/**
 * Build alert context from a MetricsCollector (exported for testing).
 */
export function buildAlertContext(
  collector: MetricsCollector,
  memoryUsageMB?: number,
  vitalRegressions?: VitalRegression[],
): AlertContext {
  const endpointSummaries = new Map<string, EndpointSummary>();
  for (const endpoint of collector.getTrackedEndpoints()) {
    endpointSummaries.set(endpoint, collector.getEndpointSummary(endpoint));
  }
  return {
    endpointSummaries,
    checkoutSummary: collector.getCheckoutSummary(),
    memoryUsageMB,
    vitalRegressions,
  };
}
