import { describe, it, expect, vi } from 'vitest';
import {
  checkBundleBudget,
  detectVitalRegression,
  DEFAULT_BUNDLE_BUDGET_BYTES,
  DEFAULT_VITAL_THRESHOLDS,
  type VitalBaseline,
} from '@/lib/perf-budget';
import { logger } from '@/lib/logger';

// Suppress logger output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    metric: vi.fn(),
  },
}));

// ── checkBundleBudget ───────────────────────────────────────

describe('checkBundleBudget', () => {
  it('passes when bundle is under budget', () => {
    const result = checkBundleBudget(300 * 1024); // 300 KB
    expect(result.pass).toBe(true);
    expect(result.deltaBytes).toBeLessThan(0);
    expect(result.message).toContain('OK');
  });

  it('passes when bundle is exactly at budget', () => {
    const result = checkBundleBudget(DEFAULT_BUNDLE_BUDGET_BYTES);
    expect(result.pass).toBe(true);
    expect(result.deltaBytes).toBe(0);
  });

  it('fails when bundle exceeds budget', () => {
    const result = checkBundleBudget(350 * 1024); // 350 KB
    expect(result.pass).toBe(false);
    expect(result.deltaBytes).toBeGreaterThan(0);
    expect(result.message).toContain('OVER budget');
  });

  it('uses custom budget when provided', () => {
    const customBudget = 200 * 1024; // 200 KB
    const result = checkBundleBudget(150 * 1024, customBudget);
    expect(result.pass).toBe(true);
    expect(result.budgetBytes).toBe(customBudget);
  });

  it('reports correct delta and message for oversize', () => {
    const actual = 330 * 1024;
    const result = checkBundleBudget(actual);
    expect(result.actualBytes).toBe(actual);
    expect(result.budgetBytes).toBe(DEFAULT_BUNDLE_BUDGET_BYTES);
    expect(result.deltaBytes).toBe(actual - DEFAULT_BUNDLE_BUDGET_BYTES);
    expect(result.message).toContain('330.0');
    expect(result.message).toContain('320.0');
  });

  it('logs a warning when bundle exceeds budget', () => {
    checkBundleBudget(350 * 1024);
    expect(logger.warn).toHaveBeenCalledWith(
      'perf_budget.bundle_exceeded',
      expect.objectContaining({ actualBytes: 350 * 1024 }),
    );
  });
});

// ── detectVitalRegression ───────────────────────────────────

describe('detectVitalRegression', () => {
  it('returns pass when vitals are within threshold', () => {
    const baselines: VitalBaseline[] = [
      { name: 'FCP', value: 1000 },
      { name: 'LCP', value: 2000 },
    ];
    // FCP grew 4 % (threshold 5 %), LCP grew 2 % (threshold 3 %)
    const current = new Map([
      ['FCP', 1040],
      ['LCP', 2040],
    ]);
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(true);
    expect(result.regressions).toHaveLength(0);
  });

  it('detects FCP regression above 5 %', () => {
    const baselines: VitalBaseline[] = [{ name: 'FCP', value: 1000 }];
    const current = new Map([['FCP', 1060]]); // 6 % growth
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(false);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].name).toBe('FCP');
    expect(result.regressions[0].growthFraction).toBeCloseTo(0.06, 2);
    expect(result.regressions[0].message).toContain('FCP');
    expect(result.regressions[0].message).toContain('6.0%');
  });

  it('detects LCP regression above 3 %', () => {
    const baselines: VitalBaseline[] = [{ name: 'LCP', value: 2000 }];
    const current = new Map([['LCP', 2080]]); // 4 % growth
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(false);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].name).toBe('LCP');
    expect(result.regressions[0].threshold).toBe(0.03);
  });

  it('detects multiple regressions at once', () => {
    const baselines: VitalBaseline[] = [
      { name: 'FCP', value: 1000 },
      { name: 'LCP', value: 2000 },
    ];
    const current = new Map([
      ['FCP', 1100], // 10 %
      ['LCP', 2100], // 5 %
    ]);
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(false);
    expect(result.regressions).toHaveLength(2);
  });

  it('ignores vitals not in currentValues', () => {
    const baselines: VitalBaseline[] = [{ name: 'FCP', value: 1000 }];
    const current = new Map<string, number>(); // empty
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(true);
    expect(result.regressions).toHaveLength(0);
  });

  it('ignores vitals not in thresholds', () => {
    const baselines: VitalBaseline[] = [{ name: 'CLS', value: 0.1 }];
    const current = new Map([['CLS', 0.5]]); // massive growth but no CLS threshold
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(true);
  });

  it('skips baseline with value 0 (avoids division by zero)', () => {
    const baselines: VitalBaseline[] = [{ name: 'FCP', value: 0 }];
    const current = new Map([['FCP', 1000]]);
    const result = detectVitalRegression(baselines, current);
    expect(result.pass).toBe(true);
  });

  it('accepts custom thresholds', () => {
    const baselines: VitalBaseline[] = [{ name: 'FCP', value: 1000 }];
    const current = new Map([['FCP', 1020]]); // 2 % growth
    // With a 1 % threshold, this should trigger
    const result = detectVitalRegression(baselines, current, { FCP: 0.01 });
    expect(result.pass).toBe(false);
    expect(result.regressions[0].threshold).toBe(0.01);
  });

  it('logs a warning for each regression', () => {
    const baselines: VitalBaseline[] = [{ name: 'FCP', value: 1000 }];
    const current = new Map([['FCP', 1100]]);
    detectVitalRegression(baselines, current);
    expect(logger.warn).toHaveBeenCalledWith(
      'perf_budget.vital_regression',
      expect.objectContaining({ vital: 'FCP' }),
    );
  });

  it('uses DEFAULT_VITAL_THRESHOLDS by default', () => {
    expect(DEFAULT_VITAL_THRESHOLDS.FCP).toBe(0.05);
    expect(DEFAULT_VITAL_THRESHOLDS.LCP).toBe(0.03);
  });
});
