# Deploy Checklist & Post-Deploy Smoke Tests

> Last updated: 2026-03-01  
> Code: `lib/deploy-checklist.ts` | Script: `scripts/post-deploy-smoke.ts`
> Evidence Log: `docs/DEPLOY-VERIFICATION-EVIDENCE.md`

---

## Pre-Deploy Checklist

| # | Item | Automated? |
|---|------|-----------|
| 1 | CI pipeline green (lint + typecheck + test + build) | ✅ |
| 2 | Migration tested on staging | Manual |
| 3 | Database backup taken (pg_dump / Supabase PITR) | Manual |
| 4 | Feature flag ready in `lib/config.ts` | Manual |
| 5 | Security audit clean (`npm audit --audit-level=high`) | ✅ |
| 6 | Error contract preserved (contract tests pass) | ✅ |
| 7 | Rollback plan documented in PR description | Manual |

## Post-Deploy Checklist

| # | Item | Automated? |
|---|------|-----------|
| 1 | Smoke tests pass | ✅ `npx tsx scripts/post-deploy-smoke.ts $URL` |
| 2 | Error rate stable (no spike within 5 min) | ✅ (SLO eval) |
| 3 | Checkout flow works (test checkout) | ✅ (smoke test) |
| 4 | Monitoring dashboards reviewed (Sentry + metrics) | Manual |
| 5 | No new Sentry issues | Manual |

## Post-Deploy Smoke Test Script

```bash
# Against localhost
npx tsx scripts/post-deploy-smoke.ts

# Against production
npx tsx scripts/post-deploy-smoke.ts https://your-production-url.com

# Against Vercel preview
npx tsx scripts/post-deploy-smoke.ts https://your-branch.vercel.app
```

### What the script checks:

| Check | Endpoint | Expected |
|-------|----------|----------|
| Homepage loads | `/` | 200 or redirect |
| Products page loads | `/en/products` | 200 or redirect |
| Login page loads | `/en/login` | 200 or redirect |
| Cart page loads | `/en/cart` | 200 or redirect |
| API vitals responds | `POST /api/vitals` | 200/400/405 |
| manifest.json loads | `/manifest.json` | 200 + valid JSON |
| Security headers present | `/en` | `x-content-type-options: nosniff` |

All checks must pass within 5s response time.

Exit code: `0` = safe, `1` = DO NOT promote.

## Rollback Decision Tree

```
Is the issue a Sev1 incident?
├─ YES → Rollback immediately, investigate after
└─ NO
   ├─ Is a forward-fix faster? (< 15 min, low risk)
   │  └─ YES → Forward-fix
   │  └─ NO → Continue to rollback
   ├─ Is the change behind a feature flag?
   │  └─ YES → Toggle flag off (no deploy needed)
   ├─ Is the DB schema changed?
   │  ├─ Additive (new table/column) → Run reverse SQL
   │  └─ Destructive (dropped column) → Restore from backup
   └─ Application-only change → Revert commit or promote previous Vercel deployment
```

## Rollback Methods

### 1. Vercel Instant Rollback (fastest)
```
Vercel Dashboard → Project → Deployments → Find last good → ⋯ → Promote
```

### 2. Git Revert
```bash
git revert HEAD --no-edit
git push origin main
# Vercel auto-deploys
```

### 3. Feature Flag Kill Switch
```ts
// lib/config.ts — set to false, redeploy or use runtime config
loyalty: false,
giftCards: false,
subscriptions: false,
```

### 4. Database Migration Rollback
See [ROLLBACK.md](ROLLBACK.md) for reverse SQL per migration.

## CI Integration

The post-deploy smoke can be added to a Vercel deploy hook or GitHub Actions:

```yaml
# Example: post-deploy smoke in CI
- name: Post-deploy smoke test
  run: npx tsx scripts/post-deploy-smoke.ts ${{ env.DEPLOY_URL }}
  env:
    DEPLOY_URL: ${{ steps.deploy.outputs.url }}
```
