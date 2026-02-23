# Memory Leak Audit

> Systematic audit of useEffect cleanup, subscriptions, timers, and unbounded caches in the Donut Shop.

**Audit date:** 2026-02-23  
**Scope:** 45 useEffect calls across hooks/, components/, app/

---

## Executive Summary

| Category | Total | Clean | Fixed | Remaining |
|----------|-------|-------|-------|-----------|
| useEffect with cleanup needed | 14 | 12 | 2 | 0 |
| useEffect (no cleanup needed) | 31 | 31 | — | 0 |
| Module-level listeners | 1 | — | — | 1 (accepted) |
| Event handler timers | 10 | — | — | Low risk |

**Result:** All meaningful leaks fixed. No unbounded cache growth. All subscriptions properly cleaned.

---

## Issues Found & Fixed

### 1. `use-add-to-cart.ts` — Timer + Abort not cleared on unmount (MEDIUM)

**Before:**
```ts
// Timer ref set in .then() callback — never cleared on unmount
timerRef.current = setTimeout(() => setStatus('idle'), 1500);
// AbortController never aborted on unmount
```

**After:**
```ts
// Added cleanup useEffect
useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  };
}, []);
```

**Impact:** Prevented `setStatus('idle')` from firing on an unmounted component. Also aborts any in-flight stock validation fetch.

### 2. `checkout/page.tsx` — `requestAnimationFrame` not cancelled (LOW)

**Before:**
```ts
useEffect(() => {
  if (shouldFocus) {
    requestAnimationFrame(() => retryButtonRef.current?.focus());
  }
}, [shouldFocus]);
```

**After:**
```ts
useEffect(() => {
  if (shouldFocus) {
    const id = requestAnimationFrame(() => retryButtonRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }
}, [shouldFocus]);
```

**Impact:** Prevents focus call on unmounted ref if component unmounts between rAF scheduling and execution.

### 3. New `useTimeout` hook — Safe one-shot timers

Created `hooks/use-timeout.ts` for the common "flash feedback" pattern used across 6+ components:
```ts
const timeout = useTimeout();
const handleCopy = () => {
  setCopied(true);
  timeout.set(() => setCopied(false), 2000); // auto-clears on unmount
};
```

---

## Clean Bill of Health

### Supabase Subscriptions
- `use-order-realtime.ts` — Channel removed + timer cleared + mounted guard ✅
- `header.tsx` — `auth.onAuthStateChange` subscription unsubscribed ✅

### Event Listeners in useEffect
- `use-checkout-machine.ts` — `removeEventListener('storage')` ✅
- `sprinkle-rain.tsx` — `removeEventListener('scroll')` ✅
- `theme-provider.tsx` — `removeEventListener('change')` ✅

### Animation Frames
- `donut-conveyor.tsx` — `cancelAnimationFrame` on unmount ✅
- `account/page.tsx` — `cancelAnimationFrame` on unmount ✅

### Timers in useEffect
- `use-debounce.ts` — `clearTimeout` ✅
- `use-order-realtime.ts` — `clearTimeout` (backoff timer) ✅
- `donut-conveyor.tsx` — `clearTimeout` + `clearInterval` ✅
- `error.tsx` — `clearInterval` ✅
- `checkout/page.tsx` — `clearInterval` (cooldown) ✅

### Storage
- **Cart (localStorage):** 2-day TTL via `onRehydrateStorage` timestamp check ✅
- **Checkout machine (sessionStorage):** 5-min stale check + explicit clear on idle/reset ✅
- **Zustand persist:** No unbounded growth detected ✅

---

## Accepted Risks

### Module-level `storage` listener in `cart-store.ts`
```ts
// Runs once at module load — cannot be removed
window.addEventListener('storage', (e) => { ... });
```
- **Risk:** LOW. In production SPA, runs exactly once.
- **Dev concern:** Could duplicate on HMR. Accepted because Zustand store module is stable.

### Event handler `setTimeout` (6 locations)
Short-lived 2-3s timers for UI feedback (copy, save, add confirmations). Risk is only React strict-mode warnings during dev, not actual memory leaks. The new `useTimeout` hook is available for migration.

---

## Test Coverage

| Test File | Tests | What |
|-----------|-------|------|
| `tests/hooks/use-timeout.test.ts` | 7 | set/clear/unmount cleanup, re-set after clear |
| `tests/hooks/memory-leak-cleanup.test.ts` | 3 | useAddToCart unmount timer+abort cleanup |

---

## Profiling Guide

To verify no memory leaks in production:

1. **Chrome DevTools → Memory → Heap Snapshot**
2. Take snapshot at baseline
3. Navigate checkout flow 10× (add to cart → checkout → back)
4. Take snapshot again
5. Compare: retained heap should be stable (±5%)

Expected: **No dangling subscription objects, no growing arrays**
