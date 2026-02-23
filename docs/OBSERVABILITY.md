# Observability — Metrics, Alerts & Dashboards

> PR29 implementation guide for the Donut Shop observability layer.

## Architecture

```
┌─────────────────┐    beacon     ┌──────────────┐
│  WebVitals.tsx  │ ──────────►  │ /api/vitals  │
│  (route-tagged) │              │  (recorder)  │
└─────────────────┘              └──────┬───────┘
                                        │
                                        ▼
                         ┌──────────────────────────┐
                         │    MetricsCollector       │
                         │  (sliding window, 5 min)  │
                         │                          │
                         │  • latency   per endpoint │
                         │  • errors    per endpoint │
                         │  • checkout  outcomes     │
                         │  • vitals    per route    │
                         └────────────┬─────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                   ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
          │ Structured   │  │ Alert Engine │  │ Sentry           │
          │ Logger       │  │ (in-code     │  │ Performance      │
          │ (JSON lines) │  │  thresholds) │  │ (auto-captured)  │
          └──────────────┘  └──────────────┘  └──────────────────┘
```

## Metrics Collected

### API Endpoint Metrics (`lib/metrics.ts`)

| Metric | Type | Description |
|--------|------|-------------|
| `p50` | Latency (ms) | Median response time |
| `p95` | Latency (ms) | 95th percentile |
| `p99` | Latency (ms) | 99th percentile |
| `max` | Latency (ms) | Maximum response time |
| `avg` | Latency (ms) | Average response time |
| `errorRate` | Rate (0–1) | Errors / total requests |
| `errorCount` | Counter | Absolute error count |

### Checkout Outcomes

| Outcome | Description |
|---------|-------------|
| `success` | 2xx response from checkout |
| `timeout` | Request timed out (HTTP 408) |
| `validation_fail` | Validation error (E_VALIDATION_FAILED) |
| `error` | Any other error |

### Web Vitals (per route)

| Vital | Good | Needs Improvement | Description |
|-------|------|-------------------|-------------|
| LCP | ≤2500ms | ≤4000ms | Largest Contentful Paint |
| CLS | ≤0.1 | ≤0.25 | Cumulative Layout Shift |
| INP | ≤200ms | ≤500ms | Interaction to Next Paint |
| FCP | ≤1800ms | ≤3000ms | First Contentful Paint |
| TTFB | ≤800ms | ≤1800ms | Time to First Byte |

Route tagging: `home`, `products`, `checkout`, `admin`, `stores`, etc.

## Alert Thresholds (`lib/alerts.ts`)

| Rule ID | Condition | Severity |
|---------|-----------|----------|
| `checkout_p99_latency` | p99 checkout > 10s | WARN |
| `api_error_rate_critical` | Any endpoint error rate > 5% (min 10 req) | CRITICAL |
| `checkout_success_rate_low` | Checkout success rate < 90% (min 10 req) | CRITICAL |
| `checkout_timeout_rate_high` | Checkout timeout rate > 10% (min 10 req) | WARN |
| `memory_growth_high` | Memory usage > 512MB | WARN |

Alerts emit:
1. Structured log line (`alert.<ruleId>`)
2. Sentry event with domain tag + severity

## Dashboard Panels (Grafana Cloud / Sentry)

### Panel 1: Checkout Success Rate (Last Hour)
```
Query: metric = "checkout_outcome_summary"
  Display: Gauge (0-100%)
  Thresholds: green ≥ 95%, yellow ≥ 90%, red < 90%
```

### Panel 2: p95 Checkout Latency by Route
```
Query: metric = "api_endpoint_summary" AND endpoint = "/api/checkout"
  Display: Time series
  Y-axis: milliseconds
  Threshold line at 10000ms (red)
```

### Panel 3: Error Rate by Classification
```
Query: "error.bucket" IN ('operational', 'programmer', 'infrastructure')
  Display: Stacked bar chart per 5-min window
  Colours: operational=yellow, programmer=red, infrastructure=orange
```

### Panel 4: Web Vitals by Route
```
Query: metric LIKE "web_vital.%"
  Group by: route
  Display: Table with colour coding (green/yellow/red per threshold)
```

### Panel 5: Alert History
```
Query: message LIKE "alert.%"
  Display: Timeline / event feed
  Colour: warn=yellow, critical=red
```

## 🚨 HUMAN ACTION: Grafana Cloud Setup

1. Sign up at https://grafana.com/auth/sign-up/create-user (free tier)
2. Create a Loki data source for log ingestion
3. Configure log shipping (e.g., via Promtail or Grafana Agent)
4. Import dashboard panels from definitions above
5. Set up notification channels (Slack/email/PagerDuty)

**Alternative**: Use Sentry Performance dashboards (already configured via `@sentry/nextjs`).

## How to Run Alert Evaluation

Alerts are evaluated on-demand. For production, call `evaluateAlerts()` periodically:

```typescript
import { metrics } from '@/lib/metrics';
import { evaluateAlerts } from '@/lib/alerts';

// e.g., in a cron job or after every N requests
const fired = evaluateAlerts(metrics, process.memoryUsage().heapUsed / 1024 / 1024);
if (fired.length > 0) {
  console.error('ALERTS FIRED:', fired);
}
```

## Log Queries (for Grafana Loki / CloudWatch)

### All checkout failures (last 24h)
```logql
{service="donut-shop"} | json | message = "api.known_error" | path = "/api/checkout"
```

### p95 latency trend
```logql
{service="donut-shop"} | json | metric = "api_endpoint_summary" | unwrap p95
```

### Fired alerts
```logql
{service="donut-shop"} | json | message =~ "alert\\..*"
```
