/**
 * Error Budget Process.
 *
 * Implements the error budget workflow from update.md section 2-C:
 *
 * | Condition                    | Action                                          |
 * |------------------------------|--------------------------------------------------|
 * | No SLO violation             | Continue feature development                    |
 * | 1 SLO red                    | Stop features, fix first. Commit: fix(slo):     |
 * | 2+ SLOs red                  | All dev stops. Root cause + postmortem + fix     |
 * | Checkout SLO red             | Always priority 1. Checkout = revenue. Immediate |
 *
 * Integrates with existing `evaluateSLOs()` from `lib/slo.ts`.
 *
 * Design decision: Declarative process engine that evaluates SLO status
 * and returns actionable recommendations. No side effects — the engineer
 * decides what to do with the recommendation.
 *
 * Alternative considered: Automated feature-flag toggling on SLO breach.
 * Rejected: too aggressive for solo developer, risk of false positives.
 */

import { logger } from './logger';

// ── Types ───────────────────────────────────────────────────

export type SLOStatus = 'green' | 'yellow' | 'red';

export interface SLOResult {
  name: string;
  status: SLOStatus;
  current: number;
  target: number;
  /** True if this is a checkout-related SLO. */
  isCheckout: boolean;
}

export type BudgetAction =
  | 'continue_development'
  | 'fix_slo_first'
  | 'all_dev_stops'
  | 'checkout_emergency';

export interface ErrorBudgetDecision {
  action: BudgetAction;
  /** Human-readable description of what to do. */
  description: string;
  /** SLOs that are in violation. */
  violations: SLOResult[];
  /** Recommended commit prefix. */
  commitPrefix?: string;
  /** Whether a postmortem is required. */
  postmortemRequired: boolean;
}

// ── Core Function ───────────────────────────────────────────

/**
 * Evaluate the error budget based on current SLO statuses.
 *
 * @param sloResults - Array of current SLO evaluation results
 * @returns Error budget decision with recommended action
 *
 * @example
 * ```ts
 * import { evaluateErrorBudget } from '@/lib/error-budget';
 * import { evaluateSLOs } from '@/lib/slo';
 *
 * const slos = evaluateSLOs();
 * const results = slos.map(slo => ({
 *   name: slo.name,
 *   status: slo.met ? 'green' : 'red',
 *   current: slo.current,
 *   target: slo.target,
 *   isCheckout: slo.name.includes('checkout'),
 * }));
 * const decision = evaluateErrorBudget(results);
 * // decision.action === 'continue_development' | 'fix_slo_first' | ...
 * ```
 */
export function evaluateErrorBudget(sloResults: SLOResult[]): ErrorBudgetDecision {
  const violations = sloResults.filter((s) => s.status === 'red');
  const checkoutViolations = violations.filter((s) => s.isCheckout);

  // Priority 1: Checkout SLO is ALWAYS highest priority
  if (checkoutViolations.length > 0) {
    const decision: ErrorBudgetDecision = {
      action: 'checkout_emergency',
      description:
        'CHECKOUT SLO RED — Checkout = revenue. Immediate fix required. All other work stops.',
      violations: checkoutViolations,
      commitPrefix: 'fix(slo):',
      postmortemRequired: true,
    };

    logger.error('error_budget.checkout_emergency', {
      violations: checkoutViolations.map((v) => v.name),
    });

    return decision;
  }

  // 2+ SLOs red: all development stops
  if (violations.length >= 2) {
    const decision: ErrorBudgetDecision = {
      action: 'all_dev_stops',
      description:
        `${violations.length} SLOs red — All development stops. Root cause analysis required. Write postmortem, fix, then continue.`,
      violations,
      commitPrefix: 'fix(slo):',
      postmortemRequired: true,
    };

    logger.error('error_budget.all_dev_stops', {
      violations: violations.map((v) => v.name),
      count: violations.length,
    });

    return decision;
  }

  // 1 SLO red: stop features, fix first
  if (violations.length === 1) {
    const decision: ErrorBudgetDecision = {
      action: 'fix_slo_first',
      description:
        `SLO "${violations[0].name}" is red (${violations[0].current} vs target ${violations[0].target}). Stop new features, fix this first.`,
      violations,
      commitPrefix: 'fix(slo):',
      postmortemRequired: false,
    };

    logger.warn('error_budget.fix_slo_first', {
      slo: violations[0].name,
      current: violations[0].current,
      target: violations[0].target,
    });

    return decision;
  }

  // All green: continue development
  return {
    action: 'continue_development',
    description: 'All SLOs green. Continue feature development.',
    violations: [],
    postmortemRequired: false,
  };
}

/**
 * Format error budget decision for commit message or PR body.
 */
export function formatBudgetStatus(decision: ErrorBudgetDecision): string {
  const lines: string[] = [
    `## Error Budget Status`,
    '',
    `**Action:** ${decision.action}`,
    `**Description:** ${decision.description}`,
  ];

  if (decision.violations.length > 0) {
    lines.push('', '**Violations:**');
    for (const v of decision.violations) {
      lines.push(`- ${v.name}: ${v.current} (target: ${v.target})`);
    }
  }

  if (decision.commitPrefix) {
    lines.push('', `**Commit prefix:** \`${decision.commitPrefix}\``);
  }

  if (decision.postmortemRequired) {
    lines.push('', '⚠️ **Postmortem required before resuming feature work.**');
  }

  return lines.join('\n');
}
