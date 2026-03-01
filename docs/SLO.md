# Service Level Objectives (SLO)

> Last updated: 2026-03-01

## Overview

SLOs define **measurable reliability targets** for the Donut Shop.
Each SLO has a target, an error budget, and evaluation logic in `lib/slo.ts`.

## Active SLOs

| # | SLO | Target | Error Budget | Window | Min. Requests |
|---|-----|--------|-------------|--------|---------------|
| 1 | Checkout Success Rate | ≥ 95 % | 5 % | 5 min (sliding) | 5 |
| 2 | Checkout p95 Latency | ≤ 2 000 ms | — | 5 min (sliding) | 10 |
| 3 | API Error Rate (all endpoints) | ≤ 1 % | 1 % | 5 min (sliding) | 20 |

## SLO 1 — Checkout Success Rate

**What:** Percentage of `POST /api/checkout` requests that return 2xx.

**Target:** ≥ 95 %

**Error Budget:** 5 % — up to 5 of every 100 checkouts can fail before the SLO is violated.

**When violated:**
1. Alert fires (`slo_checkout_success` log + Sentry event)
2. Investigate via `checkout_outcome_summary` metric logs
3. Common causes: Stripe outages, stock exhaustion, rate limiting

**Data source:** `MetricsCollector.getCheckoutSummary()`

## SLO 2 — Checkout p95 Latency

**What:** 95th percentile response time for `POST /api/checkout`.

**Target:** ≤ 2 000 ms

**When violated:**
1. Alert fires (`slo_checkout_p95_latency` log)
2. Check Stripe API response times
3. Check database connection pool saturation
4. Check Redis cache hit rates for product lookups

**Data source:** `MetricsCollector.getLatencySummary('/api/checkout')`

## SLO 3 — API Error Rate

**What:** Aggregated 5xx error rate across **all** API endpoints.

**Target:** ≤ 1 %

**Error Budget:** 1 % — up to 1 in 100 requests can error.

**When violated:**
1. Alert fires (`slo_api_error_rate` log)
2. Check per-endpoint error rates via `api_endpoint_summary` logs
3. Run error classification: transient (retry) vs. permanent (bug)

**Data source:** `MetricsCollector.getEndpointSummary()` for all tracked endpoints.

## Error Budget Policy

When an SLO is violated:
1. **Freeze** non-critical feature deployments
2. **Investigate** root cause within 1 hour
3. **Post-incident** — document in postmortem if violation lasted > 15 min
4. **Review** — monthly SLO review to adjust targets if necessary

When error budget is consumed > 80 %:
1. Prioritize reliability work over feature work
2. Review recent deployments for correlation

## Implementation

- **Code:** `lib/slo.ts` — pure evaluation functions
- **Tests:** `tests/lib/slo.test.ts` — 20+ test cases
- **Metrics source:** `lib/metrics.ts` — sliding-window MetricsCollector
- **Alerts integration:** `lib/alerts.ts` — threshold-based alerting
- **Logs:** Structured JSON via `lib/logger.ts` (key: `slo.<slo_id>`)

## How to Add a New SLO

1. Define an `SLODefinition` in `lib/slo.ts`
2. Add it to `ALL_SLOS` array
3. Write an evaluation function
4. Wire it into `evaluateSLOs()`
5. Add tests in `tests/lib/slo.test.ts`
6. Update this document
