/**
 * Incident Severity Model — Sev1 / Sev2 / Sev3.
 *
 * Provides a typed severity classification and automatic severity inference
 * from SLO violations, alert firings, and error patterns.
 *
 * Ownership:
 *  - Sev1: on-call engineer responds within 15 min, page immediately
 *  - Sev2: on-call engineer responds within 1 hour
 *  - Sev3: next business day, tracked in backlog
 *
 * Usage:
 *   import { classifyIncident, SEVERITY_DEFINITIONS } from '@/lib/incident-severity';
 *   const sev = classifyIncident(firedAlerts, sloResults);
 */

import type { FiredAlert } from './alerts';
import type { SLOResult } from './slo';

// ── Severity Levels ─────────────────────────────────────────

export type SeverityLevel = 'sev1' | 'sev2' | 'sev3';

export interface SeverityDefinition {
  level: SeverityLevel;
  /** Numeric priority (1 = highest). */
  priority: number;
  /** Human-readable name. */
  name: string;
  /** Description of impact. */
  impact: string;
  /** Expected response time. */
  responseTime: string;
  /** Who is responsible. */
  owner: string;
  /** Communication channel. */
  channel: string;
  /** Examples. */
  examples: string[];
}

export const SEVERITY_DEFINITIONS: Record<SeverityLevel, SeverityDefinition> = {
  sev1: {
    level: 'sev1',
    priority: 1,
    name: 'Critical — Revenue / Data Loss',
    impact: 'Complete checkout outage, data corruption, or security breach affecting all users',
    responseTime: '≤ 15 minutes',
    owner: 'On-call engineer + engineering lead',
    channel: 'Pager (PagerDuty/Opsgenie) + #incident-war-room',
    examples: [
      'Checkout returns 5xx for all users',
      'Stripe webhook processing stopped — orders not fulfilled',
      'Database unreachable',
      'Security breach detected (credential leak, unauthorized access)',
      'Payment double-charged (idempotency failure)',
    ],
  },
  sev2: {
    level: 'sev2',
    priority: 2,
    name: 'Degraded — Partial Impact',
    impact: 'Feature degraded but workaround exists, subset of users affected',
    responseTime: '≤ 1 hour',
    owner: 'On-call engineer',
    channel: '#incidents Slack channel',
    examples: [
      'Checkout latency > 5s (but succeeding)',
      'Email delivery queue backed up — confirmations delayed',
      'Loyalty points not being awarded after purchase',
      'One locale/region experiencing errors',
      'Rate limiter over-blocking legitimate users',
    ],
  },
  sev3: {
    level: 'sev3',
    priority: 3,
    name: 'Minor — Low Impact',
    impact: 'Cosmetic issue, non-critical feature broken, or low-frequency error',
    responseTime: 'Next business day',
    owner: 'Product team (backlog)',
    channel: '#bugs Slack channel + GitHub issue',
    examples: [
      'Visual glitch on a single page',
      'Admin dashboard metric stale by a few minutes',
      'Accessibility issue on non-critical page',
      'Cron cleanup skipped one cycle',
      'Memory usage warning (no user impact)',
    ],
  },
};

// ── Classification Logic ────────────────────────────────────

export interface IncidentClassification {
  severity: SeverityLevel;
  definition: SeverityDefinition;
  /** Reasons that drove this classification. */
  reasons: string[];
}

/**
 * Classify incident severity from current alert state and SLO results.
 *
 * Rules (evaluated in priority order):
 *  1. Any critical alert fired → Sev1
 *  2. Any SLO violated (checkout success or error rate) → Sev1
 *  3. Any warn alert fired → Sev2
 *  4. Any latency SLO violated → Sev2
 *  5. Otherwise → Sev3
 */
export function classifyIncident(
  firedAlerts: FiredAlert[],
  sloResults: SLOResult[],
): IncidentClassification {
  const reasons: string[] = [];
  let severity: SeverityLevel = 'sev3';

  // Check for critical alerts → Sev1
  const criticalAlerts = firedAlerts.filter((a) => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    severity = 'sev1';
    for (const a of criticalAlerts) {
      reasons.push(`Critical alert: ${a.ruleId} — ${a.message}`);
    }
  }

  // Check for SLO violations
  const violatedSLOs = sloResults.filter((r) => !r.pass);
  for (const v of violatedSLOs) {
    if (v.slo.id === 'slo_checkout_success' || v.slo.id === 'slo_api_error_rate') {
      // Business-critical SLO → Sev1
      if (severity !== 'sev1') severity = 'sev1';
      reasons.push(`SLO violation: ${v.slo.name} — ${v.message}`);
    } else if (v.slo.id === 'slo_checkout_p95_latency') {
      // Latency SLO → at least Sev2
      if (severity === 'sev3') severity = 'sev2';
      reasons.push(`SLO violation: ${v.slo.name} — ${v.message}`);
    }
  }

  // Check for warn alerts → Sev2
  const warnAlerts = firedAlerts.filter((a) => a.severity === 'warn');
  if (warnAlerts.length > 0 && severity === 'sev3') {
    severity = 'sev2';
  }
  for (const a of warnAlerts) {
    reasons.push(`Warning alert: ${a.ruleId} — ${a.message}`);
  }

  // Default reason if none accumulated
  if (reasons.length === 0) {
    reasons.push('No active alerts or SLO violations');
  }

  return {
    severity,
    definition: SEVERITY_DEFINITIONS[severity],
    reasons,
  };
}

/**
 * Get the severity level for a given set of conditions (quick helper).
 */
export function getSeverityLevel(
  firedAlerts: FiredAlert[],
  sloResults: SLOResult[],
): SeverityLevel {
  return classifyIncident(firedAlerts, sloResults).severity;
}
