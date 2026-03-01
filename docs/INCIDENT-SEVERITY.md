# Incident Severity Model

> Last updated: 2026-03-01

## Severity Levels

| Level | Name | Impact | Response Time | Owner | Channel |
|-------|------|--------|---------------|-------|---------|
| **Sev1** | Critical — Revenue / Data Loss | Complete checkout outage, data corruption, security breach affecting all users | ≤ 15 min | On-call engineer + engineering lead | Pager + #incident-war-room |
| **Sev2** | Degraded — Partial Impact | Feature degraded but workaround exists, subset of users affected | ≤ 1 hour | On-call engineer | #incidents Slack |
| **Sev3** | Minor — Low Impact | Cosmetic issue, non-critical feature broken, low-frequency error | Next business day | Product team (backlog) | #bugs Slack + GitHub issue |

## Sev1 Examples
- Checkout returns 5xx for all users
- Stripe webhook processing stopped — orders not fulfilled
- Database unreachable
- Security breach (credential leak, unauthorized access)
- Payment double-charged (idempotency failure)

## Sev2 Examples
- Checkout latency > 5s (but succeeding)
- Email delivery queue backed up — confirmations delayed
- Loyalty points not being awarded after purchase
- One locale/region experiencing errors
- Rate limiter over-blocking legitimate users

## Sev3 Examples
- Visual glitch on a single page
- Admin dashboard metric stale by a few minutes
- Accessibility issue on non-critical page
- Cron cleanup skipped one cycle
- Memory usage warning (no user impact)

## Automatic Classification

`lib/incident-severity.ts` provides `classifyIncident()` which infers severity from:

| Signal | Resulting Severity |
|--------|--------------------|
| Critical alert fired (e.g. Stripe circuit breaker tripped 5x) | Sev1 |
| Checkout success SLO violated (< 95 %) | Sev1 |
| API error rate SLO violated (> 1 %) | Sev1 |
| Warn alert fired (e.g. checkout timeout > 10 %) | Sev2 |
| Checkout p95 latency SLO violated (> 2 000 ms) | Sev2 |
| No alerts, no SLO violations | Sev3 |

## Incident Response Playbook

### Sev1 Response

1. **Acknowledge** — respond within 15 min on pager
2. **Triage** — identify scope (all users? one region? one feature?)
3. **Mitigate** — rollback deployment or use feature flag kill switch
4. **Communicate** — post status update in #incident-war-room
5. **Resolve** — fix root cause
6. **Postmortem** — complete within 48 hours (see `docs/POSTMORTEM-014.md` for template)

### Sev2 Response

1. **Acknowledge** — respond within 1 hour in #incidents
2. **Investigate** — check logs, metrics, SLO dashboard
3. **Fix or schedule** — if fix is safe, deploy; otherwise schedule for next sprint
4. **Document** — add note to incident log

### Sev3 Response

1. **File** — create GitHub issue with `sev3` label
2. **Prioritize** — include in next sprint planning
3. **Fix** — standard PR flow

## Integration Points

- **Code:** `lib/incident-severity.ts`
- **Tests:** `tests/lib/incident-severity.test.ts`
- **SLO source:** `lib/slo.ts`
- **Alert source:** `lib/alerts.ts`
- **Postmortem template:** `docs/POSTMORTEM-014.md`
- **Runbook:** `docs/RUNBOOK.md`
