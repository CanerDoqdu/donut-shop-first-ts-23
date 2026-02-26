'use client';

import { useReducer, useCallback, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────

export type CheckoutState =
  | 'idle'
  | 'validating'
  | 'reserving'
  | 'redirecting'
  | 'success'
  | 'failed'
  | 'timeout';

export type CheckoutEvent =
  | { type: 'START_CHECKOUT' }
  | { type: 'VALIDATION_OK' }
  | { type: 'VALIDATION_FAIL'; error: string }
  | { type: 'RESERVATION_OK'; url: string }
  | { type: 'RESERVATION_FAIL'; error: string }
  | { type: 'REDIRECT_OK' }
  | { type: 'TIMEOUT' }
  | { type: 'CART_SYNC_FAILED'; error: string }    // Bug #1: PR25 rollback fires this
  | { type: 'CART_CLEARED_EXTERNAL' }               // Bug #2: cross-tab cart wipe
  | { type: 'RETRY' }
  | { type: 'RESET' };

interface MachineContext {
  state: CheckoutState;
  error: string | null;
  redirectUrl: string | null;
  retryCount: number;
  lastTransitionAt: number;
}

// ─── Storage key ────────────────────────────────────────────────

const STORAGE_KEY = 'donut-checkout-machine';

function persistState(ctx: MachineContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // sessionStorage full or unavailable — silent
  }
}

function hydrateState(): MachineContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MachineContext;
    // Non-resumable states should not survive across page loads.
    // In particular, 'redirecting' can get stuck when user navigates back from Stripe.
    const nonResumableStates: CheckoutState[] = ['failed', 'timeout', 'redirecting'];
    if (nonResumableStates.includes(parsed.state)) {
      return null;
    }
    // Stale check: if state was set >5 min ago on a transient state, reset
    const STALE_MS = 5 * 60 * 1000;
    const transientStates: CheckoutState[] = ['validating', 'reserving', 'redirecting'];
    if (transientStates.includes(parsed.state) && Date.now() - parsed.lastTransitionAt > STALE_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearPersistedState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

// ─── Allowed transitions (deterministic) ────────────────────────

const TRANSITIONS: Record<CheckoutState, Partial<Record<CheckoutEvent['type'], CheckoutState>>> = {
  idle:        { START_CHECKOUT: 'validating', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'idle', RESET: 'idle' },
  validating:  { VALIDATION_OK: 'reserving', VALIDATION_FAIL: 'failed', TIMEOUT: 'timeout', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'failed', RESET: 'idle' },
  reserving:   { RESERVATION_OK: 'redirecting', RESERVATION_FAIL: 'failed', TIMEOUT: 'timeout', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'failed', RESET: 'idle' },
  redirecting: { REDIRECT_OK: 'success', TIMEOUT: 'timeout', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'failed', RESET: 'idle' },
  success:     { RESET: 'idle' },
  failed:      { START_CHECKOUT: 'validating', VALIDATION_FAIL: 'failed', RETRY: 'idle', RESET: 'idle' },
  timeout:     { START_CHECKOUT: 'validating', RETRY: 'idle', RESET: 'idle' },
};

// ─── Max retries ────────────────────────────────────────────────

export const MAX_RETRIES = 3;

/** Exponential cooldown: 1s → 2s → 4s */
export function getRetryCooldownMs(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 4000);
}

// ─── Reducer ────────────────────────────────────────────────────

function initialContext(): MachineContext {
  return {
    state: 'idle',
    error: null,
    redirectUrl: null,
    retryCount: 0,
    lastTransitionAt: Date.now(),
  };
}

function machineReducer(ctx: MachineContext, event: CheckoutEvent): MachineContext {
  const allowed = TRANSITIONS[ctx.state];
  const nextState = allowed[event.type];

  // Invalid transition — no-op
  if (!nextState) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[CheckoutMachine] Invalid transition: ${ctx.state} + ${event.type}`);
    }
    return ctx;
  }

  const next: MachineContext = {
    ...ctx,
    state: nextState,
    lastTransitionAt: Date.now(),
  };

  // Enrich context based on event
  switch (event.type) {
    case 'VALIDATION_FAIL':
    case 'RESERVATION_FAIL':
    case 'CART_SYNC_FAILED':
      next.error = event.type === 'CART_SYNC_FAILED'
        ? (event as { type: 'CART_SYNC_FAILED'; error: string }).error
        : 'error' in event ? (event as { error: string }).error : 'Unknown error';
      break;
    case 'CART_CLEARED_EXTERNAL':
      next.error = 'Cart was modified in another tab';
      break;
    case 'TIMEOUT':
      next.error = 'Request timed out. Please try again.';
      break;
    case 'RESERVATION_OK':
      next.redirectUrl = (event as { type: 'RESERVATION_OK'; url: string }).url;
      break;
    case 'RETRY':
      next.error = null;
      next.redirectUrl = null;
      next.retryCount = ctx.retryCount + 1;
      break;
    case 'RESET':
      return initialContext();
    default:
      break;
  }

  return next;
}

// ─── Hook ───────────────────────────────────────────────────────

export interface UseCheckoutMachineReturn {
  /** Current state */
  state: CheckoutState;
  /** Error message if in failed/timeout state */
  error: string | null;
  /** Stripe redirect URL if in redirecting state */
  redirectUrl: string | null;
  /** Number of retries so far */
  retryCount: number;
  /** Whether machine can accept RETRY */
  canRetry: boolean;
  /** Whether machine is in a "busy" transient state */
  isBusy: boolean;
  /** Dispatch an event */
  send: (event: CheckoutEvent) => void;
  /** Reset to idle + clear sessionStorage */
  reset: () => void;
}

export function useCheckoutMachine(): UseCheckoutMachineReturn {
  const [ctx, dispatch] = useReducer(machineReducer, undefined, () => {
    // On first render, try to hydrate from sessionStorage
    const stored = hydrateState();
    if (stored) {
      return stored;
    }
    return initialContext();
  });

  // Persist on every state change
  useEffect(() => {
    if (ctx.state === 'idle') {
      clearPersistedState();
    } else {
      persistState(ctx);
    }
  }, [ctx]);

  // Bug #2: Listen for cross-tab cart changes via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== 'donut-cart-storage') return;

      // Only react to cart changes when in a transient checkout state
      const transient: CheckoutState[] = ['validating', 'reserving', 'redirecting'];
      if (!transient.includes(ctx.state)) return;

      // Check if cart was emptied
      try {
        if (!e.newValue) {
          dispatch({ type: 'CART_CLEARED_EXTERNAL' });
          return;
        }
        const parsed = JSON.parse(e.newValue);
        const items = parsed?.state?.items ?? [];
        if (items.length === 0) {
          dispatch({ type: 'CART_CLEARED_EXTERNAL' });
        }
      } catch {
        // Parse error — ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [ctx.state]);

  const send = useCallback((event: CheckoutEvent) => {
    dispatch(event);
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    clearPersistedState();
  }, []);

  const canRetry = (ctx.state === 'failed' || ctx.state === 'timeout') && ctx.retryCount < MAX_RETRIES;
  const isBusy = ['validating', 'reserving', 'redirecting'].includes(ctx.state);

  return {
    state: ctx.state,
    error: ctx.error,
    redirectUrl: ctx.redirectUrl,
    retryCount: ctx.retryCount,
    canRetry,
    isBusy,
    send,
    reset,
  };
}
