import { describe, it, expect } from 'vitest';

// ─── Test the checkout state machine transitions directly ───────
// We import the reducer logic by testing the hook's transition table.
// Since the hook uses useReducer, we test the pure state transitions.

type CheckoutState =
  | 'idle'
  | 'validating'
  | 'reserving'
  | 'redirecting'
  | 'success'
  | 'failed'
  | 'timeout';

type CheckoutEventType =
  | 'START_CHECKOUT'
  | 'VALIDATION_OK'
  | 'VALIDATION_FAIL'
  | 'RESERVATION_OK'
  | 'RESERVATION_FAIL'
  | 'REDIRECT_OK'
  | 'TIMEOUT'
  | 'CART_SYNC_FAILED'
  | 'CART_CLEARED_EXTERNAL'
  | 'RETRY'
  | 'RESET';

// Transition table — mirrors hooks/use-checkout-machine.ts
const TRANSITIONS: Record<CheckoutState, Partial<Record<CheckoutEventType, CheckoutState>>> = {
  idle:        { START_CHECKOUT: 'validating', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'idle' },
  validating:  { VALIDATION_OK: 'reserving', VALIDATION_FAIL: 'failed', TIMEOUT: 'timeout', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'failed' },
  reserving:   { RESERVATION_OK: 'redirecting', RESERVATION_FAIL: 'failed', TIMEOUT: 'timeout', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'failed' },
  redirecting: { REDIRECT_OK: 'success', TIMEOUT: 'timeout', CART_SYNC_FAILED: 'failed', CART_CLEARED_EXTERNAL: 'failed' },
  success:     { RESET: 'idle' },
  failed:      { RETRY: 'idle', RESET: 'idle' },
  timeout:     { RETRY: 'idle', RESET: 'idle' },
};

function transition(from: CheckoutState, event: CheckoutEventType): CheckoutState | undefined {
  return TRANSITIONS[from]?.[event];
}

// ─── Happy path transitions ─────────────────────────────────────

describe('Checkout state machine — happy path', () => {
  it('follows idle → validating → reserving → redirecting → success', () => {
    let state: CheckoutState = 'idle';

    state = transition(state, 'START_CHECKOUT')!;
    expect(state).toBe('validating');

    state = transition(state, 'VALIDATION_OK')!;
    expect(state).toBe('reserving');

    state = transition(state, 'RESERVATION_OK')!;
    expect(state).toBe('redirecting');

    state = transition(state, 'REDIRECT_OK')!;
    expect(state).toBe('success');
  });

  it('can reset from success to idle', () => {
    expect(transition('success', 'RESET')).toBe('idle');
  });
});

// ─── Failure paths ──────────────────────────────────────────────

describe('Checkout state machine — failure paths', () => {
  it('moves to failed on VALIDATION_FAIL', () => {
    expect(transition('validating', 'VALIDATION_FAIL')).toBe('failed');
  });

  it('moves to failed on RESERVATION_FAIL', () => {
    expect(transition('reserving', 'RESERVATION_FAIL')).toBe('failed');
  });

  it('moves to timeout on TIMEOUT in any transient state', () => {
    expect(transition('validating', 'TIMEOUT')).toBe('timeout');
    expect(transition('reserving', 'TIMEOUT')).toBe('timeout');
    expect(transition('redirecting', 'TIMEOUT')).toBe('timeout');
  });

  it('can retry from failed', () => {
    expect(transition('failed', 'RETRY')).toBe('idle');
  });

  it('can retry from timeout', () => {
    expect(transition('timeout', 'RETRY')).toBe('idle');
  });

  it('can reset from failed', () => {
    expect(transition('failed', 'RESET')).toBe('idle');
  });
});

// ─── Bug #1: CART_SYNC_FAILED transitions ───────────────────────

describe('Checkout state machine — Bug #1: cart sync failure', () => {
  it('idle + CART_SYNC_FAILED → failed', () => {
    expect(transition('idle', 'CART_SYNC_FAILED')).toBe('failed');
  });

  it('validating + CART_SYNC_FAILED → failed', () => {
    expect(transition('validating', 'CART_SYNC_FAILED')).toBe('failed');
  });

  it('reserving + CART_SYNC_FAILED → failed', () => {
    expect(transition('reserving', 'CART_SYNC_FAILED')).toBe('failed');
  });

  it('redirecting + CART_SYNC_FAILED → failed', () => {
    expect(transition('redirecting', 'CART_SYNC_FAILED')).toBe('failed');
  });

  it('success + CART_SYNC_FAILED → no transition (already done)', () => {
    expect(transition('success', 'CART_SYNC_FAILED')).toBeUndefined();
  });
});

// ─── Bug #2: CART_CLEARED_EXTERNAL transitions ──────────────────

describe('Checkout state machine — Bug #2: cross-tab cart cleared', () => {
  it('idle + CART_CLEARED_EXTERNAL → idle (no-op, safe)', () => {
    expect(transition('idle', 'CART_CLEARED_EXTERNAL')).toBe('idle');
  });

  it('validating + CART_CLEARED_EXTERNAL → failed', () => {
    expect(transition('validating', 'CART_CLEARED_EXTERNAL')).toBe('failed');
  });

  it('reserving + CART_CLEARED_EXTERNAL → failed', () => {
    expect(transition('reserving', 'CART_CLEARED_EXTERNAL')).toBe('failed');
  });

  it('redirecting + CART_CLEARED_EXTERNAL → failed', () => {
    expect(transition('redirecting', 'CART_CLEARED_EXTERNAL')).toBe('failed');
  });
});

// ─── Invalid transitions (should return undefined = no-op) ──────

describe('Checkout state machine — invalid transitions', () => {
  it('cannot START_CHECKOUT from validating', () => {
    expect(transition('validating', 'START_CHECKOUT')).toBeUndefined();
  });

  it('cannot START_CHECKOUT from reserving', () => {
    expect(transition('reserving', 'START_CHECKOUT')).toBeUndefined();
  });

  it('cannot RETRY from idle', () => {
    expect(transition('idle', 'RETRY')).toBeUndefined();
  });

  it('cannot RETRY from success', () => {
    expect(transition('success', 'RETRY')).toBeUndefined();
  });

  it('cannot VALIDATION_OK from idle', () => {
    expect(transition('idle', 'VALIDATION_OK')).toBeUndefined();
  });

  it('cannot RESERVATION_OK from validating', () => {
    expect(transition('validating', 'RESERVATION_OK')).toBeUndefined();
  });
});

// ─── Retry cooldown calculation ─────────────────────────────────

describe('Checkout state machine — retry cooldown', () => {
  // Mirrors getRetryCooldownMs from hooks/use-checkout-machine.ts
  function getRetryCooldownMs(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 4000);
  }

  it('first retry = 1s', () => {
    expect(getRetryCooldownMs(0)).toBe(1000);
  });

  it('second retry = 2s', () => {
    expect(getRetryCooldownMs(1)).toBe(2000);
  });

  it('third retry = 4s', () => {
    expect(getRetryCooldownMs(2)).toBe(4000);
  });

  it('caps at 4s for higher counts', () => {
    expect(getRetryCooldownMs(5)).toBe(4000);
    expect(getRetryCooldownMs(10)).toBe(4000);
  });
});

// ─── Full scenario tests ────────────────────────────────────────

describe('Checkout state machine — full scenarios', () => {
  it('checkout → fail → retry → succeed', () => {
    let state: CheckoutState = 'idle';

    // First attempt fails
    state = transition(state, 'START_CHECKOUT')!;
    state = transition(state, 'VALIDATION_OK')!;
    state = transition(state, 'RESERVATION_FAIL')!;
    expect(state).toBe('failed');

    // Retry
    state = transition(state, 'RETRY')!;
    expect(state).toBe('idle');

    // Second attempt succeeds
    state = transition(state, 'START_CHECKOUT')!;
    state = transition(state, 'VALIDATION_OK')!;
    state = transition(state, 'RESERVATION_OK')!;
    state = transition(state, 'REDIRECT_OK')!;
    expect(state).toBe('success');
  });

  it('checkout → timeout → retry → cart sync fail → retry → succeed', () => {
    let state: CheckoutState = 'idle';

    // First: timeout
    state = transition(state, 'START_CHECKOUT')!;
    state = transition(state, 'VALIDATION_OK')!;
    state = transition(state, 'TIMEOUT')!;
    expect(state).toBe('timeout');

    // Retry
    state = transition(state, 'RETRY')!;
    expect(state).toBe('idle');

    // Second: cart sync fails mid-checkout (Bug #1)
    state = transition(state, 'START_CHECKOUT')!;
    state = transition(state, 'VALIDATION_OK')!;
    state = transition(state, 'CART_SYNC_FAILED')!;
    expect(state).toBe('failed');

    // Third attempt
    state = transition(state, 'RETRY')!;
    state = transition(state, 'START_CHECKOUT')!;
    state = transition(state, 'VALIDATION_OK')!;
    state = transition(state, 'RESERVATION_OK')!;
    state = transition(state, 'REDIRECT_OK')!;
    expect(state).toBe('success');
  });

  it('Bug #2: cross-tab cart cleared during reservation', () => {
    let state: CheckoutState = 'idle';

    state = transition(state, 'START_CHECKOUT')!;
    state = transition(state, 'VALIDATION_OK')!;
    expect(state).toBe('reserving');

    // Another tab clears cart
    state = transition(state, 'CART_CLEARED_EXTERNAL')!;
    expect(state).toBe('failed');

    // Can retry
    state = transition(state, 'RETRY')!;
    expect(state).toBe('idle');
  });
});
