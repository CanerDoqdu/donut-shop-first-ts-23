# Deploy Verification Evidence Log

Use this file to keep in-repo evidence for PR36 production deployment verification.

## Required Evidence

- Deployed URL (production or staging)
- Timestamp (UTC)
- Commit SHA
- Post-deploy smoke command used
- Smoke result summary (pass/fail)
- Follow-up action (promote/rollback)

## Entry Template

```md
### <yyyy-mm-ddThh:mm:ssZ>
- URL: <https://...>
- Commit: <sha>
- Command: `npx tsx scripts/post-deploy-smoke.ts <url>`
- Result: PASS | FAIL
- Notes: <short observation>
- Decision: Promote | Rollback
```

## Entries

<!-- Add verified deployment entries below. -->

### 2026-03-05T13:26:10Z
- URL: https://donut-shop-one.vercel.app
- Commit: 07c3cca
- Command: `npx tsx scripts/post-deploy-smoke.ts https://donut-shop-one.vercel.app`
- Result: PASS
- Notes: 8/8 checks passed including vitals endpoint and security headers.
- Decision: Promote
