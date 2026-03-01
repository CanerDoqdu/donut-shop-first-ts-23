/**
 * Service Level Objectives (SLO) — measurable reliability targets.
 *
 * Defines three core SLOs:
 *  1. Checkout success rate  ≥ 95 % (over 5-minute window)
 *  2. API p95 latency        ≤ 2 000 ms (checkout endpoint)
 *  3. API error rate          ≤ 1 % (all endpoints aggregated)
 *
 * Each SLO is a pure function: feed it metrics → get pass/fail + margin.
 * The `evaluateSLOs` helper checks all targets at once and emits structured
 * logs so dashboards and alerting can consume results uniformly.
 *
 * Error budget = 100 % − SLO target.  e.g. 95 % checkout success → 5 % budget.
 *
 * Usage:
 *   import { evaluateSLOs } from '@/lib/slo';
 *   const results = evaluateSLOs(metrics);
 *   results.forEach(r => console.log(r.name, r.pass));
 */

import { logger } from './logger';
import type { MetricsCollector, EndpointSummary, CheckoutSummary } from './metrics';

// ── SLO Definitions ─────────────────────────────────────────

export interface SLODefinition {
  /** Machine-readable identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** What is measured. */
  description: string;
  /** Target as a fraction (0-1) or absolute number depending on type. */
  target: number;
  /** Unit for the target value. */
  unit: 'percent' | 'ms';
  /** Error budget = 100% − target% (only meaningful for percent SLOs). */
  errorBudgetPercent: number;
}

export interface SLOResult {
  /** SLO definition. */
  slo: SLODefinition;
  /** Current measured value (same unit as target). */
  current: number;
  /** Whether the SLO is met. */
  pass: boolean;
  /** How far above/below the target (positive = healthy margin). */
  margin: number;
  /** Error budget remaining as percent (null for non-percent SLOs). */
  errorBudgetRemaining: number | null;
  /** Human-readable status message. */
  message: string;
}

// ── SLO Registry ────────────────────────────────────────────

export const SLO_CHECKOUT_SUCCESS: SLODefinition = {
  id: 'slo_checkout_success',
  name: 'Checkout Success Rate',
  description: 'Percentage of checkout requests that complete successfully (2xx)',
  target: 95,
  unit: 'percent',
  errorBudgetPercent: 5,
};

export const SLO_CHECKOUT_P95_LATENCY: SLODefinition = {
  id: 'slo_checkout_p95_latency',
  name: 'Checkout p95 Latency',
  description: 'p95 response time for POST /api/checkout',
  target: 2000,
  unit: 'ms',
  errorBudgetPercent: 0, // latency SLOs don't have a traditional error budget
};

export const SLO_API_ERROR_RATE: SLODefinition = {
  id: 'slo_api_error_rate',
  name: 'API Error Rate',
  description: 'Aggregated error rate across all API endpoints',
  target: 1,
  unit: 'percent',
  errorBudgetPercent: 1,
};

export const ALL_SLOS: SLODefinition[] = [
  SLO_CHECKOUT_SUCCESS,
  SLO_CHECKOUT_P95_LATENCY,
  SLO_API_ERROR_RATE,
];

// ── Evaluation Functions ────────────────────────────────────

/**
 * Evaluate checkout success rate SLO.
 * Minimum 5 requests in window to avoid noise.
 */
export function evaluateCheckoutSuccess(checkout: CheckoutSummary): SLOResult {
  const slo = SLO_CHECKOUT_SUCCESS;

  if (checkout.total < 5) {
    return {
      slo,
      current: checkout.total === 0 ? 100 : checkout.successRate * 100,
      pass: true, // insufficient data → assume healthy
      margin: 0,
      errorBudgetRemaining: slo.errorBudgetPercent,
      message: `Insufficient data (${checkout.total} requests, minimum 5)`,
    };
  }

  const currentPercent = checkout.successRate * 100;
  const pass = currentPercent >= slo.target;
  const margin = currentPercent - slo.target;
  const consumed = 100 - currentPercent; // error % consumed
  const budgetRemaining = Math.max(0, slo.errorBudgetPercent - consumed);

  return {
    slo,
    current: round2(currentPercent),
    pass,
    margin: round2(margin),
    errorBudgetRemaining: round2(budgetRemaining),
    message: pass
      ? `Checkout success ${round2(currentPercent)}% ≥ ${slo.target}% (margin +${round2(margin)}pp)`
      : `Checkout success ${round2(currentPercent)}% < ${slo.target}% (violation −${round2(Math.abs(margin))}pp)`,
  };
}

/**
 * Evaluate checkout p95 latency SLO.
 * Minimum 10 requests in window.
 */
export function evaluateCheckoutLatency(
  endpointSummary: EndpointSummary | undefined,
): SLOResult {
  const slo = SLO_CHECKOUT_P95_LATENCY;

  if (!endpointSummary || endpointSummary.totalRequests < 10) {
    return {
      slo,
      current: endpointSummary?.latency.p95 ?? 0,
      pass: true,
      margin: 0,
      errorBudgetRemaining: null,
      message: `Insufficient data (${endpointSummary?.totalRequests ?? 0} requests, minimum 10)`,
    };
  }

  const currentMs = endpointSummary.latency.p95;
  const pass = currentMs <= slo.target;
  const margin = slo.target - currentMs;

  return {
    slo,
    current: Math.round(currentMs),
    pass,
    margin: Math.round(margin),
    errorBudgetRemaining: null,
    message: pass
      ? `Checkout p95 ${Math.round(currentMs)}ms ≤ ${slo.target}ms (headroom ${Math.round(margin)}ms)`
      : `Checkout p95 ${Math.round(currentMs)}ms > ${slo.target}ms (violation +${Math.round(Math.abs(margin))}ms)`,
  };
}

/**
 * Evaluate aggregated API error rate SLO.
 * Aggregates all tracked endpoints. Minimum 20 total requests.
 */
export function evaluateApiErrorRate(
  endpointSummaries: Map<string, EndpointSummary>,
): SLOResult {
  const slo = SLO_API_ERROR_RATE;

  let totalRequests = 0;
  let totalErrors = 0;
  for (const summary of endpointSummaries.values()) {
    totalRequests += summary.totalRequests;
    totalErrors += summary.errorCount;
  }

  if (totalRequests < 20) {
    return {
      slo,
      current: totalRequests === 0 ? 0 : round2((totalErrors / totalRequests) * 100),
      pass: true,
      margin: 0,
      errorBudgetRemaining: slo.errorBudgetPercent,
      message: `Insufficient data (${totalRequests} requests, minimum 20)`,
    };
  }

  const currentPercent = (totalErrors / totalRequests) * 100;
  const pass = currentPercent <= slo.target;
  const margin = slo.target - currentPercent;
  const budgetRemaining = Math.max(0, slo.errorBudgetPercent - currentPercent);

  return {
    slo,
    current: round2(currentPercent),
    pass,
    margin: round2(margin),
    errorBudgetRemaining: round2(budgetRemaining),
    message: pass
      ? `API error rate ${round2(currentPercent)}% ≤ ${slo.target}% (margin ${round2(margin)}pp)`
      : `API error rate ${round2(currentPercent)}% > ${slo.target}% (violation +${round2(Math.abs(margin))}pp)`,
  };
}

// ── Aggregate Evaluator ─────────────────────────────────────

/**
 * Evaluate ALL SLOs against current metrics.
 * Emits structured logs for each SLO result.
 */
export function evaluateSLOs(collector: MetricsCollector): SLOResult[] {
  const endpointSummaries = new Map<string, EndpointSummary>();
  for (const endpoint of collector.getTrackedEndpoints()) {
    endpointSummaries.set(endpoint, collector.getEndpointSummary(endpoint));
  }

  const results: SLOResult[] = [
    evaluateCheckoutSuccess(collector.getCheckoutSummary()),
    evaluateCheckoutLatency(endpointSummaries.get('/api/checkout')),
    evaluateApiErrorRate(endpointSummaries),
  ];

  for (const result of results) {
    const level = result.pass ? 'info' : 'warn';
    logger[level](`slo.${result.slo.id}`, {
      sloId: result.slo.id,
      pass: result.pass,
      current: result.current,
      target: result.slo.target,
      unit: result.slo.unit,
      margin: result.margin,
      errorBudgetRemaining: result.errorBudgetRemaining,
      message: result.message,
    });
  }

  return results;
}

// ── Helpers ─────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
