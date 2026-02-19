# CI Pipeline

## Overview

GitHub Actions workflow at `.github/workflows/ci.yml`.

Triggers: `push` to `main`, all `pull_request` to `main`.

Concurrency: grouped by `ci-${{ github.ref }}`, cancels in-progress runs.

## Jobs

### 1. Lint
```
npm ci → npm run lint
```
ESLint with `eslint-config-next`. Runs on every push/PR.

### 2. Type Check
```
npm ci → npm run typecheck
```
`tsc --noEmit` in strict mode.

### 3. Security Audit
```
npm ci → npm audit --audit-level=high
```
Non-blocking (`continue-on-error: true`). Reports high-severity vulnerabilities.

### 4. Build (PR-safe)
```
npm ci → npm run build
```
- Depends on: lint + typecheck
- Uses placeholder secrets for PR builds (safe for forks)
- Caches `.next/cache` by lockfile + source hash
- Uploads `.next` as artifact (7-day retention)

### 5. Build (Real Secrets) — main only
- Runs only on `push` to `main`
- Validates all required secrets exist
- Builds with real env vars from GitHub Secrets

### 6. Bundle Analysis — PR only
- Runs `ANALYZE=true npm run build`
- Uses `@next/bundle-analyzer` for size visualization

## Environment Variables in CI

**Secrets** (sensitive, stored in GitHub Secrets):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`

**Variables** (non-sensitive, stored in GitHub Variables):
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`

## Adding Test Job

To add tests to CI, add this job to `ci.yml`:

```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: npm
    - run: npm ci
    - run: npm test
```

## Node Version

All jobs use Node.js 20 (`env.NODE_VERSION`).
