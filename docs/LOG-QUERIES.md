# Log Aggregation Query Examples

> **Purpose:** Ready-to-use queries for searching structured logs.
> These queries work with Sentry Discover, Grafana Loki, or any JSON log aggregator.

---

## 1. All Checkout Failures by Error Type (Last 24h)

### Sentry Discover
```
event.type:error tag:domain:checkout timestamp:>now-24h
| stats count() by tag:error.bucket, tag:error.code
| sort count desc
```

### Grafana Loki (LogQL)
```logql
{service="donut-shop"} | json
  | message =~ "checkout.*"
  | error_bucket != ""
  | line_format "{{.error_code}} [{{.error_bucket}}]"
  | count_over_time({service="donut-shop"} | json | message =~ "checkout.*" [24h]) by (error_bucket, error_code)
```

### JSON Log Search (grep / jq)
```bash
# All checkout errors grouped by bucket + code
cat logs.json | jq -r '
  select(.message | test("checkout|api.known_error|api.unhandled_error"))
  | select(."error.bucket" != null)
  | [."error.bucket", ."error.code", .timestamp] | @tsv
' | sort | uniq -c | sort -rn
```

---

## 2. User Journey: Request → Cart → Checkout (Trace with correlationId)

### Sentry Discover
```
tag:correlationId:<CORRELATION_ID>
| sort timestamp asc
```

### Grafana Loki
```logql
{service="donut-shop"} | json | correlationId = "<CORRELATION_ID>" | line_format "{{.timestamp}} [{{.level}}] {{.message}} path={{.path}}"
```

### JSON Log Search
```bash
# Reconstruct a user's full journey
cat logs.json | jq -r '
  select(.correlationId == "<CORRELATION_ID>")
  | [.timestamp, .level, .message, .path, .requestId] | @tsv
' | sort
```

---

## 3. Operational vs Programmer vs Infrastructure Errors

### Sentry Discover
```
event.type:error
| stats count() by tag:error.bucket
| sort count desc
```

### Grafana Loki
```logql
sum by (error_bucket) (
  count_over_time(
    {service="donut-shop"} | json | error_bucket != "" [1h]
  )
)
```

### JSON Log Search
```bash
# Error counts by bucket (last hour)
cat logs.json | jq -r '
  select(."error.bucket" != null)
  | ."error.bucket"
' | sort | uniq -c | sort -rn
```

---

## 4. Checkout Success Rate (Percentage)

```bash
# Success vs failure in checkout
TOTAL=$(cat logs.json | jq '[select(.path == "/api/checkout")] | length')
ERRORS=$(cat logs.json | jq '[select(.path == "/api/checkout" and .level == "error")] | length')
echo "Success rate: $(( (TOTAL - ERRORS) * 100 / TOTAL ))%"
```

---

## 5. Retryable Errors (Safe for Auto-Retry)

```bash
cat logs.json | jq -r '
  select(."error.retryable" == true)
  | [.timestamp, ."error.code", ."error.domain", .path] | @tsv
' | head -50
```

---

## 6. Infrastructure Errors (Ops Escalation)

```bash
# These need immediate ops attention
cat logs.json | jq -r '
  select(."error.bucket" == "infrastructure")
  | [.timestamp, ."error.code", ."error.domain", .message] | @tsv
' | sort -r | head -20
```

---

## 7. Slow Requests (p95 / p99 Latency)

```bash
# All requests with durationMs, sorted by latency
cat logs.json | jq -r '
  select(.durationMs != null)
  | [.durationMs, .path, .method, .status] | @tsv
' | sort -rn | head -20
```

---

## Field Reference

| Field | Description | Example |
|---|---|---|
| `requestId` | Unique per-request UUID | `a1b2c3d4-...` |
| `correlationId` | User journey UUID (spans multiple requests) | `e5f6g7h8-...` |
| `error.code` | Machine-readable error code | `E_STRIPE_CHECKOUT_FAILED` |
| `error.bucket` | Classification: operational / programmer / infrastructure | `infrastructure` |
| `error.retryable` | Whether auto-retry is safe | `true` |
| `error.severity` | Sentry severity level | `error` |
| `error.domain` | Subsystem: checkout / realtime / queue / webhook | `checkout` |
| `durationMs` | Request processing time in milliseconds | `340` |
| `service` | Always `donut-shop` | `donut-shop` |
| `path` | API route path | `/api/checkout` |
| `method` | HTTP method | `POST` |
