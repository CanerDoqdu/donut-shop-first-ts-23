import { describe, it, expect } from 'vitest';
import {
  classifyIncident,
  getSeverityLevel,
  SEVERITY_DEFINITIONS,
  type SeverityLevel,
} from '@/lib/incident-severity';
import type { FiredAlert } from '@/lib/alerts';
import type { SLOResult } from '@/lib/slo';
import { SLO_CHECKOUT_SUCCESS, SLO_CHECKOUT_P95_LATENCY, SLO_API_ERROR_RATE } from '@/lib/slo';

// ── Helpers ─────────────────────────────────────────────────

function makeAlert(overrides: Partial<FiredAlert>): FiredAlert {
  return {
    ruleId: 'test_alert',
    severity: 'warn',
    message: 'test alert',
    domain: 'checkout',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeSLOResult(overrides: Partial<SLOResult> & { slo: SLOResult['slo'] }): SLOResult {
  return {
    current: 99,
    pass: true,
    margin: 4,
    errorBudgetRemaining: 4,
    message: 'ok',
    ...overrides,
  };
}

// ── Severity Definitions ────────────────────────────────────

describe('SEVERITY_DEFINITIONS', () => {
  it('has 3 levels: sev1, sev2, sev3', () => {
    expect(Object.keys(SEVERITY_DEFINITIONS)).toEqual(['sev1', 'sev2', 'sev3']);
  });

  it('sev1 has ≤ 15 minutes response time', () => {
    expect(SEVERITY_DEFINITIONS.sev1.responseTime).toContain('15');
  });

  it('sev2 has ≤ 1 hour response time', () => {
    expect(SEVERITY_DEFINITIONS.sev2.responseTime).toContain('1 hour');
  });

  it('sev3 has next business day response time', () => {
    expect(SEVERITY_DEFINITIONS.sev3.responseTime).toContain('Next business day');
  });

  it('each severity has examples', () => {
    for (const def of Object.values(SEVERITY_DEFINITIONS)) {
      expect(def.examples.length).toBeGreaterThan(0);
    }
  });

  it('priorities are 1 < 2 < 3', () => {
    expect(SEVERITY_DEFINITIONS.sev1.priority).toBe(1);
    expect(SEVERITY_DEFINITIONS.sev2.priority).toBe(2);
    expect(SEVERITY_DEFINITIONS.sev3.priority).toBe(3);
  });

  it('each severity has owner and channel', () => {
    for (const def of Object.values(SEVERITY_DEFINITIONS)) {
      expect(def.owner.length).toBeGreaterThan(0);
      expect(def.channel.length).toBeGreaterThan(0);
    }
  });
});

// ── classifyIncident ────────────────────────────────────────

describe('classifyIncident', () => {
  it('returns sev3 with no alerts and no SLO violations', () => {
    const result = classifyIncident([], []);
    expect(result.severity).toBe('sev3');
    expect(result.reasons).toContain('No active alerts or SLO violations');
  });

  it('returns sev1 on critical alert', () => {
    const alerts = [makeAlert({ severity: 'critical', ruleId: 'api_error_rate_critical', message: 'Error rate > 5%' })];
    const result = classifyIncident(alerts, []);
    expect(result.severity).toBe('sev1');
    expect(result.reasons[0]).toContain('Critical alert');
  });

  it('returns sev2 on warn alert only', () => {
    const alerts = [makeAlert({ severity: 'warn', ruleId: 'checkout_timeout_rate_high', message: 'Timeout rate > 10%' })];
    const result = classifyIncident(alerts, []);
    expect(result.severity).toBe('sev2');
    expect(result.reasons[0]).toContain('Warning alert');
  });

  it('returns sev1 on checkout success SLO violation', () => {
    const sloResults = [
      makeSLOResult({ slo: SLO_CHECKOUT_SUCCESS, pass: false, current: 85, message: '85% < 95%' }),
    ];
    const result = classifyIncident([], sloResults);
    expect(result.severity).toBe('sev1');
    expect(result.reasons[0]).toContain('SLO violation');
  });

  it('returns sev1 on API error rate SLO violation', () => {
    const sloResults = [
      makeSLOResult({ slo: SLO_API_ERROR_RATE, pass: false, current: 5, message: '5% > 1%' }),
    ];
    const result = classifyIncident([], sloResults);
    expect(result.severity).toBe('sev1');
  });

  it('returns sev2 on latency SLO violation only', () => {
    const sloResults = [
      makeSLOResult({ slo: SLO_CHECKOUT_P95_LATENCY, pass: false, current: 3000, message: '3000ms > 2000ms' }),
    ];
    const result = classifyIncident([], sloResults);
    expect(result.severity).toBe('sev2');
  });

  it('critical alert overrides latency SLO → sev1', () => {
    const alerts = [makeAlert({ severity: 'critical', ruleId: 'stripe_circuit_breaker_tripped' })];
    const sloResults = [
      makeSLOResult({ slo: SLO_CHECKOUT_P95_LATENCY, pass: false, current: 5000, message: '5000ms > 2000ms' }),
    ];
    const result = classifyIncident(alerts, sloResults);
    expect(result.severity).toBe('sev1');
  });

  it('returns correct definition for each severity', () => {
    const levels: SeverityLevel[] = ['sev1', 'sev2', 'sev3'];
    // sev1 via critical alert
    const r1 = classifyIncident([makeAlert({ severity: 'critical' })], []);
    expect(r1.definition.level).toBe('sev1');
    // sev2 via warn alert
    const r2 = classifyIncident([makeAlert({ severity: 'warn' })], []);
    expect(r2.definition.level).toBe('sev2');
    // sev3 via nothing
    const r3 = classifyIncident([], []);
    expect(r3.definition.level).toBe('sev3');
  });

  it('accumulates multiple reasons', () => {
    const alerts = [
      makeAlert({ severity: 'critical', ruleId: 'a', message: 'alert a' }),
      makeAlert({ severity: 'warn', ruleId: 'b', message: 'alert b' }),
    ];
    const sloResults = [
      makeSLOResult({ slo: SLO_CHECKOUT_SUCCESS, pass: false, current: 80, message: '80% < 95%' }),
    ];
    const result = classifyIncident(alerts, sloResults);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});

// ── getSeverityLevel helper ─────────────────────────────────

describe('getSeverityLevel', () => {
  it('returns severity level string directly', () => {
    expect(getSeverityLevel([], [])).toBe('sev3');
    expect(getSeverityLevel([makeAlert({ severity: 'critical' })], [])).toBe('sev1');
    expect(getSeverityLevel([makeAlert({ severity: 'warn' })], [])).toBe('sev2');
  });
});
