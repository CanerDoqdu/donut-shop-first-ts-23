import { describe, it, expect } from 'vitest';
import {
  PRE_DEPLOY_CHECKLIST,
  POST_DEPLOY_CHECKLIST,
  ROLLBACK_DECISION_CHECKLIST,
  ALL_CHECKLIST_ITEMS,
  getAutomatedChecks,
  getManualChecks,
} from '@/lib/deploy-checklist';

// ── Checklist Structure ─────────────────────────────────────

describe('Deploy checklist structure', () => {
  it('has pre-deploy items', () => {
    expect(PRE_DEPLOY_CHECKLIST.length).toBeGreaterThanOrEqual(5);
  });

  it('has post-deploy items', () => {
    expect(POST_DEPLOY_CHECKLIST.length).toBeGreaterThanOrEqual(3);
  });

  it('has rollback decision items', () => {
    expect(ROLLBACK_DECISION_CHECKLIST.length).toBeGreaterThanOrEqual(3);
  });

  it('ALL_CHECKLIST_ITEMS = pre + post + rollback', () => {
    expect(ALL_CHECKLIST_ITEMS.length).toBe(
      PRE_DEPLOY_CHECKLIST.length +
      POST_DEPLOY_CHECKLIST.length +
      ROLLBACK_DECISION_CHECKLIST.length,
    );
  });

  it('all items have unique IDs', () => {
    const ids = ALL_CHECKLIST_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all items have valid categories', () => {
    for (const item of ALL_CHECKLIST_ITEMS) {
      expect(['pre-deploy', 'post-deploy', 'rollback-decision']).toContain(item.category);
    }
  });

  it('all items have title and description', () => {
    for (const item of ALL_CHECKLIST_ITEMS) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});

// ── Filtered helpers ────────────────────────────────────────

describe('getAutomatedChecks', () => {
  it('returns only automated items', () => {
    const automated = getAutomatedChecks();
    expect(automated.length).toBeGreaterThan(0);
    expect(automated.every((i) => i.automated)).toBe(true);
  });

  it('includes CI pipeline check', () => {
    expect(getAutomatedChecks().some((i) => i.id === 'pre-01')).toBe(true);
  });

  it('includes smoke test check', () => {
    expect(getAutomatedChecks().some((i) => i.id === 'post-01')).toBe(true);
  });
});

describe('getManualChecks', () => {
  it('returns only manual items', () => {
    const manual = getManualChecks();
    expect(manual.length).toBeGreaterThan(0);
    expect(manual.every((i) => !i.automated)).toBe(true);
  });

  it('includes migration testing check', () => {
    expect(getManualChecks().some((i) => i.id === 'pre-02')).toBe(true);
  });
});

// ── Critical items present ──────────────────────────────────

describe('Critical checklist items exist', () => {
  it('pre-deploy: CI pipeline green', () => {
    expect(PRE_DEPLOY_CHECKLIST.some((i) => i.title.toLowerCase().includes('ci'))).toBe(true);
  });

  it('pre-deploy: database backup', () => {
    expect(PRE_DEPLOY_CHECKLIST.some((i) => i.title.toLowerCase().includes('backup'))).toBe(true);
  });

  it('pre-deploy: rollback plan documented', () => {
    expect(PRE_DEPLOY_CHECKLIST.some((i) => i.title.toLowerCase().includes('rollback'))).toBe(true);
  });

  it('post-deploy: smoke tests pass', () => {
    expect(POST_DEPLOY_CHECKLIST.some((i) => i.title.toLowerCase().includes('smoke'))).toBe(true);
  });

  it('post-deploy: error rate stable', () => {
    expect(POST_DEPLOY_CHECKLIST.some((i) => i.title.toLowerCase().includes('error'))).toBe(true);
  });

  it('rollback-decision: Sev1 check', () => {
    expect(ROLLBACK_DECISION_CHECKLIST.some((i) => i.title.toLowerCase().includes('sev1'))).toBe(true);
  });

  it('rollback-decision: DB schema check', () => {
    expect(ROLLBACK_DECISION_CHECKLIST.some((i) => i.title.toLowerCase().includes('db'))).toBe(true);
  });
});
