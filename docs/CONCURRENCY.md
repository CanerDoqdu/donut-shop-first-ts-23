# Concurrency Safety

> How the Donut Shop prevents race conditions, double-charges, and cross-tab cart conflicts during checkout.

---

## Problem Statement

Checkout involves multiple async steps (validate → reserve → redirect to Stripe). Several race conditions can occur:

| Scenario | Risk | Impact |
|---|---|---|
| **Double-click** | Two Stripe sessions created for the same cart | Customer charged twice |
| **Cross-tab cart wipe** | Tab A starts checkout → Tab B clears cart → Tab A completes with stale data | Order for empty cart |
| **Stale checkout response** | Cart modified while checkout is in-flight | Stripe session for wrong items |
| **Network retry** | Slow response → user refreshes → original request completes | Duplicate order |

## Solution Architecture

We use a **dual-guard** pattern — client-side deduplication + server-side idempotency:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Side                          │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ UI: button  │───▶│ useCheckout  │───▶│ inflight ref  │  │
│  │  disabled   │    │   Submit()   │    │  guard (dedup) │  │
│  └─────────────┘    └──────┬───────┘    └───────────────┘  │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │ idempotency key│                       │
│                    │ (sessionStorage│                       │
│                    │  per checkout) │                       │
│                    └───────┬────────┘                       │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │  POST /api/checkout
                             │  X-Idempotency-Key: <uuid>
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        Server Side                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ INSERT INTO orders (idempotency_key, ...)            │   │
│  │ ON CONFLICT (idempotency_key) → return existing order│   │
│  │ → 409 with X-Idempotent-Replay header                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Guard Layers

### 1. UI Button Disable (`isSubmitting`)

The `useCheckoutSubmit` hook exposes `isSubmitting` — the submit button should be disabled while `true`.

```tsx
const { submit, isSubmitting } = useCheckoutSubmit();

<Button disabled={isSubmitting} onClick={() => submit(payload)}>
  {isSubmitting ? 'Processing…' : 'Checkout'}
</Button>
```

### 2. Client In-Flight Ref Guard

If `submit()` is called while a previous call is still pending (e.g., double-click faster than React re-render), the second call returns the **same promise** — no second fetch is made.

```ts
// hooks/use-checkout-submit.ts
const inflightRef = useRef<Promise<CheckoutResult> | null>(null);

const submit = useCallback(async (payload) => {
  if (inflightRef.current) return inflightRef.current; // dedup!
  // ...
}, []);
```

### 3. Idempotency Key (Server-Side)

Every checkout request includes a UUID idempotency key:
- Stored in `sessionStorage` via `getOrCreateIdempotencyKey()`
- Sent in both `X-Idempotency-Key` header and request body
- Server: `INSERT INTO orders ... ON CONFLICT (idempotency_key)` → returns 409 with existing order ID
- Client handles 409 as **replay-safe** if `orderId` is present in response

After successful checkout, the key is **rotated** (`rotateIdempotencyKey()`) so the next checkout gets a fresh key.

### 4. Stale Request Guard (Generation Counter)

The `createStaleGuard()` utility tracks cart mutations via a generation counter:

```ts
const guard = createStaleGuard();
const gen = guard.current();    // capture before checkout
// ... cart modified ...
guard.bump();                    // generation incremented
guard.isStale(gen);             // true → discard in-flight result
```

### 5. Cross-Tab Cart Sync (`watchCartChanges`)

Listens to `StorageEvent` on the cart key. If another tab clears the cart, the current tab is notified:

```ts
const cleanup = watchCartChanges('donut-cart', () => {
  // Cart was cleared in another tab
  machine.send('CART_CLEARED_EXTERNAL');
});
```

This integrates with the checkout state machine's `CART_CLEARED_EXTERNAL` event.

## Generic Utilities (`lib/concurrency.ts`)

| Utility | Purpose |
|---|---|
| `createInflightGuard(fn)` | Wraps any async function to deduplicate concurrent calls |
| `createStaleGuard()` | Generation counter for detecting stale responses |
| `simulateConcurrent(fn, n)` | Test utility: fires N concurrent calls, returns `allSettled` |
| `watchCartChanges(key, onClear, onChange?)` | Cross-tab cart change detector via `StorageEvent` |

## Race Condition Timeline

### Double-Click (Prevented)

```
T0  User double-clicks "Checkout"
T1  submit() #1 → inflightRef acquired, fetch starts
T2  submit() #2 → inflightRef exists → returns same promise (NO fetch)
T3  Server processes 1 request → 200 OK
T4  Both calls resolve to same result
```

### Cross-Tab Cart Wipe (Handled)

```
T0  Tab A: user clicks "Checkout" → machine enters 'validating'
T1  Tab B: user clears cart → localStorage updated
T2  Tab A: StorageEvent fires → CART_CLEARED_EXTERNAL
T3  Tab A: machine transitions to 'failed' → UI shows error
T4  Tab A: original checkout response arrives → discarded (stale generation)
```

### Network Retry / Idempotency (Handled)

```
T0  Client sends POST /api/checkout { idempotencyKey: "abc-123" }
T1  Slow response... user navigates away and back
T2  Client retries with same idempotencyKey "abc-123"
T3  Server: ON CONFLICT → returns 409 + existing orderId
T4  Client treats 409+orderId as success (replay-safe)
```

## Test Coverage

| Test File | Scenarios |
|---|---|
| `tests/lib/concurrent-checkout.test.ts` | inflightGuard dedup, staleGuard, simulateConcurrent, watchCartChanges, idempotency simulation |
| `tests/hooks/checkout-race.test.ts` | useCheckoutSubmit hook: double-click dedup, 409 handling, error states, key rotation |

## ADR Reference

See [ADR-010: Checkout Concurrency Controls](docs/adr/) for the architectural decision record.
