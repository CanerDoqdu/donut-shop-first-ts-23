/**
 * Error Budget Process Tests.
 *
 * Tests all decision paths from update.md 2-C:
 * - All green → continue
 * - 1 red → fix first
 * - 2+ red → all stops
 * - Checkout red → emergency (always priority 1)
 * - Format function
 */

import { describe, it, expect, vi } from 'vitest';
import {
  evaluateErrorBudget,
  formatBudgetStatus,
  type SLOResult,
} from '@/lib/error-budget';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    metric: vi.fn(),
  },
}));

// ── Test Data ───────────────────────────────────────────────

const greenSLO: SLOResult = {
  name: 'p95_latency',
  status: 'green',
  current: 200,
  target: 500,
  isCheckout: false,
};

const yellowSLO: SLOResult = {
  name: 'error_rate',
  status: 'yellow',
  current: 0.8,
  target: 1,
  isCheckout: false,
};

const redSLO: SLOResult = {
  name: 'error_rate',
  status: 'red',
  current: 2.5,
  target: 1,
  isCheckout: false,
};

const redSLO2: SLOResult = {
  name: 'availability',
  status: 'red',
  current: 98,
  target: 99.5,
  isCheckout: false,
};

const checkoutRedSLO: SLOResult = {
  name: 'checkout_success_rate',
  status: 'red',
  current: 92,
  target: 99,
  isCheckout: true,
};

// ── Tests ───────────────────────────────────────────────────

describe('evaluateErrorBudget', () => {
  it('returns continue_development when all SLOs are green', () => {
    const decision = evaluateErrorBudget([greenSLO, yellowSLO]);

    expect(decision.action).toBe('continue_development');
    expect(decision.violations).toHaveLength(0);
    expect(decision.postmortemRequired).toBe(false);
    expect(decision.commitPrefix).toBeUndefined();
  });

  it('returns fix_slo_first when 1 SLO is red', () => {
    const decision = evaluateErrorBudget([greenSLO, redSLO]);

    expect(decision.action).toBe('fix_slo_first');
    expect(decision.violations).toHaveLength(1);
    expect(decision.violations[0].name).toBe('error_rate');
    expect(decision.commitPrefix).toBe('fix(slo):');
    expect(decision.postmortemRequired).toBe(false);
  });

  it('returns all_dev_stops when 2+ SLOs are red', () => {
    const decision = evaluateErrorBudget([greenSLO, redSLO, redSLO2]);

    expect(decision.action).toBe('all_dev_stops');
    expect(decision.violations).toHaveLength(2);
    expect(decision.postmortemRequired).toBe(true);
    expect(decision.commitPrefix).toBe('fix(slo):');
  });

  it('returns checkout_emergency when checkout SLO is red (highest priority)', () => {
    const decision = evaluateErrorBudget([greenSLO, checkoutRedSLO]);

    expect(decision.action).toBe('checkout_emergency');
    expect(decision.violations).toHaveLength(1);
    expect(decision.violations[0].isCheckout).toBe(true);
    expect(decision.postmortemRequired).toBe(true);
  });

  it('checkout_emergency takes priority over 2+ red SLOs', () => {
    const decision = evaluateErrorBudget([redSLO, redSLO2, checkoutRedSLO]);

    expect(decision.action).toBe('checkout_emergency');
    // Only checkout violations in the decision
    expect(decision.violations.every((v) => v.isCheckout)).toBe(true);
  });

  it('handles empty SLO results', () => {
    const decision = evaluateErrorBudget([]);

    expect(decision.action).toBe('continue_development');
    expect(decision.violations).toHaveLength(0);
  });
});

describe('formatBudgetStatus', () => {
  it('formats green status', () => {
    const decision = evaluateErrorBudget([greenSLO]);
    const output = formatBudgetStatus(decision);

    expect(output).toContain('Error Budget Status');
    expect(output).toContain('continue_development');
  });

  it('formats red status with violations', () => {
    const decision = evaluateErrorBudget([redSLO]);
    const output = formatBudgetStatus(decision);

    expect(output).toContain('fix_slo_first');
    expect(output).toContain('error_rate');
    expect(output).toContain('fix(slo):');
  });

  it('includes postmortem warning when required', () => {
    const decision = evaluateErrorBudget([redSLO, redSLO2]);
    const output = formatBudgetStatus(decision);

    expect(output).toContain('Postmortem required');
  });
});
