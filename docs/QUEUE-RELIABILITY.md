# Queue Reliability

> Retry policies, poison-message handling, and dead-letter queue management.

## Retry Policies

| Queue | Attempts | Strategy | Initial Delay | Max Delay | Jitter |
|-------|----------|----------|---------------|-----------|--------|
| email-queue | 5 | exponential (×4) | 2 s | 10 min | ✓ |
| loyalty-queue | 3 | exponential (×4) | 1 s | 1 min | ✗ |
| cleanup-queue | 2 | fixed | 5 s | 5 s | ✗ |

**Rationale**: Email delivery is highest priority and can tolerate longer retries
(external SMTP providers have transient failures). Loyalty can be eventually
consistent. Cleanup jobs are idempotent and should fail fast.

## Poison Message Handling

A **poison message** is a job whose payload is structurally invalid, meaning it
will **never** succeed regardless of how many times it is retried.

### Detection Rules

| Check | Trigger |
|-------|---------|
| Null/undefined data | `data === null \|\| data === undefined` |
| Non-object type | `typeof data !== 'object'` |
| Circular reference | `JSON.stringify()` throws |
| Oversized payload | Serialized size > 1 MB |
| Email-specific | Missing `to`, `type`, `subject` / invalid email format |
| Loyalty-specific | Missing `userId`, `orderId` / negative `points` |

### What Happens

1. Before each retry the worker calls `isPoisonMessage()` (or the
   queue-specific validator).
2. If poisoned → job is immediately moved to the DLQ with
   `isPoisoned: true` and the reasons array.
3. `logPoisonQuarantine()` emits a structured error log for alerting.
4. The job is **not** retried.

## Dead-Letter Queue (DLQ) Management

### Classification

Every DLQ entry is classified as one of:

| Type | Meaning | Auto-replay safe? |
|------|---------|-------------------|
| `poison` | Structurally invalid data | **No** — needs data fix first |
| `infra_failure` | Network/DB/rate-limit timeout | **Yes** — safe to replay |
| `unknown` | Unrecognized error | **No** — needs investigation |

### Replay Safety

`isSafeToReplay(entry)` returns `true` only for `infra_failure` entries.
Operators should:

1. Fix the root cause (restore DB connectivity, clear rate-limit, etc.)
2. Call replay only on `infra_failure` entries
3. Manually remediate `poison` entries (fix data, then re-enqueue)

### Infrastructure Failure Patterns

Recognised patterns (case-insensitive match on `failedReason`):

```
ECONNREFUSED, ECONNRESET, ETIMEDOUT, socket hang up,
getaddrinfo, service unavailable, 503, 502,
rate limit, 429, database, supabase, redis, network
```

## Integration with Existing Queue System

This module is complementary to `lib/queue/`:

- **connection.ts** still manages BullMQ connections
- **queues.ts** still defines queue instances and enqueue helpers
- **workers.ts** still handles worker lifecycle and basic DLQ move
- **queue-reliability.ts** adds: poison checks, retry policies, DLQ classification

### Recommended Worker Enhancement

```typescript
// In workers.ts processor:
import { isPoisonMessage, logPoisonQuarantine } from '@/lib/queue-reliability';

async function processJob(job: Job) {
  const check = isPoisonMessage(job.data);
  if (check.isPoisoned) {
    logPoisonQuarantine(job.queueName, job.id!, check.reasons);
    throw new UnrecoverableError('Poison message: ' + check.reasons.join(', '));
  }
  // ... normal processing
}
```

## Monitoring

Queue reliability events to watch in logs:

| Event | Log Key | Severity |
|-------|---------|----------|
| Poison quarantine | `queue.poison.quarantined` | error |
| DLQ entry created | `queue.dlq.added` | warn |
| Replay attempted | `queue.dlq.replayed` | info |

## Circuit Breaker Fallback Proof (PR35)

Run this drill to verify graceful degradation behavior is still enforced:

```bash
npm test -- tests/lib/circuit-breaker.test.ts
```

Expected proof points from the suite:

- `stripe` breaker trips after 2 consecutive failures and fast-fails while OPEN.
- `redis` breaker trips after 3 consecutive failures and fallback path remains reachable.
- Alert rules fire at expected thresholds:
  - `stripe_circuit_breaker_tripped` at `>= 5`
  - `redis_circuit_breaker_tripped` at `>= 3`

If this suite fails, do not promote queue-related changes until degradation paths are restored.

## See Also

- [DEAD-LETTER.md](DEAD-LETTER.md) — DLQ architecture
- [RUNBOOK.md](RUNBOOK.md) — on-call procedures
- [OBSERVABILITY.md](OBSERVABILITY.md) — log/metric collection
