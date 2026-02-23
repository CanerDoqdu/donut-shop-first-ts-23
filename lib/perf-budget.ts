/**
 * Performance Budget — bundle-size + Web Vitals regression detection.
 *
 * Two concerns:
 *  1. **Bundle guard** — CI fails if First Load JS exceeds a threshold (default 320 KB).
 *  2. **Vital regression** — alerts when FCP / LCP grow beyond a percentage vs baseline.
 *
 * Both are pure, side-effect-free functions so they're trivially testable
 * and composable with the alert engine in `lib/alerts.ts`.
 *
 * Usage:
 *   import { checkBundleBudget, detectVitalRegression } from '@/lib/perf-budget';
 *
 *   // Bundle guard (CI)
 *   const result = checkBundleBudget(315_000);
 *   if (!result.pass) process.exit(1);
 *
 *   // Vital regression (monitoring)
 *   const regressions = detectVitalRegression(baseline, current);
 */

import { logger } from './logger';

// ── Configuration ───────────────────────────────────────────

/** Default maximum First Load JS in bytes (320 KB). */
export const DEFAULT_BUNDLE_BUDGET_BYTES = 320 * 1024;

/** Default per-vital regression thresholds (fraction, e.g. 0.05 = 5 %). */
export const DEFAULT_VITAL_THRESHOLDS: Record<string, number> = {
  FCP: 0.05, // alert if FCP grows > 5 %
  LCP: 0.03, // alert if LCP grows > 3 %
};

// ── Types ───────────────────────────────────────────────────

export interface BundleBudgetResult {
  /** Whether the bundle is within budget. */
  pass: boolean;
  /** Actual first-load JS size in bytes. */
  actualBytes: number;
  /** Budget limit in bytes. */
  budgetBytes: number;
  /** How much over/under budget (negative = under). */
  deltaBytes: number;
  /** Human-readable message. */
  message: string;
}

export interface VitalBaseline {
  /** Vital name (e.g. "FCP", "LCP"). */
  name: string;
  /** Baseline value in ms. */
  value: number;
}

export interface VitalRegression {
  /** Vital name. */
  name: string;
  /** Baseline value (ms). */
  baseline: number;
  /** Current value (ms). */
  current: number;
  /** Growth as a fraction (e.g. 0.08 = 8 %). */
  growthFraction: number;
  /** Configured threshold fraction. */
  threshold: number;
  /** Human-readable message. */
  message: string;
}

export interface VitalRegressionResult {
  /** True if no regressions detected. */
  pass: boolean;
  /** Individual regressions found (empty if pass is true). */
  regressions: VitalRegression[];
}

// ── Bundle Budget ───────────────────────────────────────────

/**
 * Check whether the first-load JS bundle is within the performance budget.
 *
 * @param actualBytes - Actual first-load JS size in bytes
 * @param budgetBytes - Maximum allowed size in bytes (default 320 KB)
 * @returns Result object with pass/fail + diagnostics
 */
export function checkBundleBudget(
  actualBytes: number,
  budgetBytes: number = DEFAULT_BUNDLE_BUDGET_BYTES,
): BundleBudgetResult {
  const deltaBytes = actualBytes - budgetBytes;
  const pass = deltaBytes <= 0;

  const actualKB = (actualBytes / 1024).toFixed(1);
  const budgetKB = (budgetBytes / 1024).toFixed(1);

  const message = pass
    ? `Bundle OK: ${actualKB} KB (budget: ${budgetKB} KB)`
    : `Bundle OVER budget: ${actualKB} KB exceeds ${budgetKB} KB by ${(deltaBytes / 1024).toFixed(1)} KB`;

  if (!pass) {
    logger.warn('perf_budget.bundle_exceeded', {
      actualBytes,
      budgetBytes,
      deltaBytes,
      actualKB,
      budgetKB,
    });
  }

  return { pass, actualBytes, budgetBytes, deltaBytes, message };
}

// ── Vital Regression Detection ──────────────────────────────

/**
 * Compare current Web Vital values against baselines and detect regressions.
 *
 * A regression is flagged when `(current - baseline) / baseline > threshold`.
 *
 * @param baselines - Array of baseline vital measurements
 * @param currentValues - Map of vital name → current value (ms)
 * @param thresholds - Per-vital growth thresholds (default: FCP 5 %, LCP 3 %)
 * @returns Result with pass/fail + detailed regression list
 */
export function detectVitalRegression(
  baselines: VitalBaseline[],
  currentValues: Map<string, number>,
  thresholds: Record<string, number> = DEFAULT_VITAL_THRESHOLDS,
): VitalRegressionResult {
  const regressions: VitalRegression[] = [];

  for (const baseline of baselines) {
    const current = currentValues.get(baseline.name);
    if (current === undefined) continue;

    // Skip if baseline is 0 to avoid division by zero
    if (baseline.value <= 0) continue;

    const threshold = thresholds[baseline.name];
    if (threshold === undefined) continue;

    const growthFraction = (current - baseline.value) / baseline.value;

    if (growthFraction > threshold) {
      const pct = (growthFraction * 100).toFixed(1);
      const threshPct = (threshold * 100).toFixed(0);

      const regression: VitalRegression = {
        name: baseline.name,
        baseline: baseline.value,
        current,
        growthFraction,
        threshold,
        message: `${baseline.name} regressed ${pct}% (${baseline.value}ms → ${current}ms, threshold: ${threshPct}%)`,
      };

      regressions.push(regression);

      logger.warn('perf_budget.vital_regression', {
        vital: baseline.name,
        baseline: baseline.value,
        current,
        growthPercent: pct,
        threshold: threshPct,
      });
    }
  }

  return { pass: regressions.length === 0, regressions };
}
