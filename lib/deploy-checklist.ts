/**
 * Deploy Rollback Checklist — codified validation steps.
 *
 * Each checklist item is a pure function returning pass/fail + reason.
 * Used by both human operators (docs reference) and automation
 * (post-deploy smoke, CI gate).
 *
 * See docs/DEPLOY-CHECKLIST.md for the human-readable version.
 */

// ── Checklist Item Types ────────────────────────────────────

export interface ChecklistItem {
  id: string;
  category: 'pre-deploy' | 'post-deploy' | 'rollback-decision';
  title: string;
  description: string;
  automated: boolean;
}

// ── Pre-deploy Checklist ────────────────────────────────────

export const PRE_DEPLOY_CHECKLIST: ChecklistItem[] = [
  {
    id: 'pre-01',
    category: 'pre-deploy',
    title: 'CI pipeline green',
    description: 'lint + typecheck + test + build all pass on the PR',
    automated: true,
  },
  {
    id: 'pre-02',
    category: 'pre-deploy',
    title: 'Migration tested on staging',
    description: 'Run forward + reverse SQL on staging DB before production',
    automated: false,
  },
  {
    id: 'pre-03',
    category: 'pre-deploy',
    title: 'Database backup taken',
    description: 'pg_dump or Supabase point-in-time recovery enabled',
    automated: false,
  },
  {
    id: 'pre-04',
    category: 'pre-deploy',
    title: 'Feature flag ready',
    description: 'New features behind a flag in lib/config.ts for instant disable',
    automated: false,
  },
  {
    id: 'pre-05',
    category: 'pre-deploy',
    title: 'Security audit clean',
    description: 'npm audit --audit-level=high shows no critical/high vulnerabilities',
    automated: true,
  },
  {
    id: 'pre-06',
    category: 'pre-deploy',
    title: 'Error contract preserved',
    description: 'Contract tests pass — no response shape breakage',
    automated: true,
  },
  {
    id: 'pre-07',
    category: 'pre-deploy',
    title: 'Rollback plan documented',
    description: 'PR contains rollback instructions (revert commit, reverse SQL, or flag toggle)',
    automated: false,
  },
];

// ── Post-deploy Checklist ───────────────────────────────────

export const POST_DEPLOY_CHECKLIST: ChecklistItem[] = [
  {
    id: 'post-01',
    category: 'post-deploy',
    title: 'Smoke tests pass',
    description: 'Run scripts/post-deploy-smoke.ts against production URL',
    automated: true,
  },
  {
    id: 'post-02',
    category: 'post-deploy',
    title: 'Error rate stable',
    description: 'No spike in error rate within 5 minutes of deploy',
    automated: true,
  },
  {
    id: 'post-03',
    category: 'post-deploy',
    title: 'Checkout flow works',
    description: 'At least one successful test checkout (automated or manual)',
    automated: true,
  },
  {
    id: 'post-04',
    category: 'post-deploy',
    title: 'Monitoring dashboards reviewed',
    description: 'Check Sentry for new error spikes, review metrics summary',
    automated: false,
  },
  {
    id: 'post-05',
    category: 'post-deploy',
    title: 'No new Sentry issues',
    description: 'Sentry shows zero new unresolved issues post-deploy',
    automated: false,
  },
];

// ── Rollback Decision Checklist ─────────────────────────────

export const ROLLBACK_DECISION_CHECKLIST: ChecklistItem[] = [
  {
    id: 'rb-01',
    category: 'rollback-decision',
    title: 'Is this a Sev1 incident?',
    description: 'If yes → rollback immediately, investigate after',
    automated: false,
  },
  {
    id: 'rb-02',
    category: 'rollback-decision',
    title: 'Is a forward-fix faster?',
    description: 'If fix is < 15 min and lower risk than rollback, prefer forward-fix',
    automated: false,
  },
  {
    id: 'rb-03',
    category: 'rollback-decision',
    title: 'Is the DB schema changed?',
    description: 'If additive (new table/column) → safe to reverse. If destructive → restore from backup',
    automated: false,
  },
  {
    id: 'rb-04',
    category: 'rollback-decision',
    title: 'Can a feature flag mitigate?',
    description: 'If the change is behind a flag, toggle it off instead of full rollback',
    automated: false,
  },
];

// ── Aggregate ───────────────────────────────────────────────

export const ALL_CHECKLIST_ITEMS: ChecklistItem[] = [
  ...PRE_DEPLOY_CHECKLIST,
  ...POST_DEPLOY_CHECKLIST,
  ...ROLLBACK_DECISION_CHECKLIST,
];

/**
 * Get all automated checklist items (for CI integration).
 */
export function getAutomatedChecks(): ChecklistItem[] {
  return ALL_CHECKLIST_ITEMS.filter((item) => item.automated);
}

/**
 * Get all manual checklist items (for human operators).
 */
export function getManualChecks(): ChecklistItem[] {
  return ALL_CHECKLIST_ITEMS.filter((item) => !item.automated);
}
