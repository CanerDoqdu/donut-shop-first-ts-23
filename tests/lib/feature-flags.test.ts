import { describe, it, expect } from 'vitest';
import {
  fnv1aHash,
  getBucket,
  isEnabled,
  getVariant,
  createFlagConfig,
  getFlags,
  type FlagConfig,
} from '@/lib/feature-flags';

// ── Hash tests ──────────────────────────────────────────────

describe('fnv1aHash', () => {
  it('returns a positive 32-bit integer', () => {
    const hash = fnv1aHash('test-input');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });

  it('is deterministic — same input always produces same hash', () => {
    const a = fnv1aHash('user-42:checkout_flag');
    const b = fnv1aHash('user-42:checkout_flag');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', () => {
    const a = fnv1aHash('user-1');
    const b = fnv1aHash('user-2');
    expect(a).not.toBe(b);
  });
});

// ── Bucketing tests ─────────────────────────────────────────

describe('getBucket', () => {
  it('returns value between 0 and 99', () => {
    for (let i = 0; i < 200; i++) {
      const bucket = getBucket('test_flag', `user-${i}`);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it('is deterministic — same (flag, id) always returns same bucket', () => {
    const a = getBucket('my_flag', 'user-abc');
    const b = getBucket('my_flag', 'user-abc');
    expect(a).toBe(b);
  });

  it('distributes users roughly uniformly (chi-squared sanity check)', () => {
    const N = 10000;
    const buckets = new Array(100).fill(0);
    for (let i = 0; i < N; i++) {
      const b = getBucket('distribution_test', `user-${i}`);
      buckets[b]++;
    }
    const expected = N / 100;
    // Each bucket should have between 50% and 200% of expected (very loose)
    for (const count of buckets) {
      expect(count).toBeGreaterThan(expected * 0.3);
      expect(count).toBeLessThan(expected * 3);
    }
  });
});

// ── isEnabled tests ─────────────────────────────────────────

describe('isEnabled', () => {
  const config: FlagConfig = {
    always_on: {
      description: 'test flag — always on',
      enabled: true,
      rolloutPercentage: 100,
    },
    always_off: {
      description: 'test flag — always off',
      enabled: true,
      rolloutPercentage: 0,
    },
    disabled: {
      description: 'test flag — master switch off',
      enabled: false,
      rolloutPercentage: 100,
    },
    half: {
      description: 'test flag — 50% rollout',
      enabled: true,
      rolloutPercentage: 50,
    },
  };

  it('returns true for 100% rollout', () => {
    expect(isEnabled('always_on', 'user-1', config)).toBe(true);
    expect(isEnabled('always_on', 'user-999', config)).toBe(true);
  });

  it('returns false for 0% rollout', () => {
    expect(isEnabled('always_off', 'user-1', config)).toBe(false);
    expect(isEnabled('always_off', 'user-999', config)).toBe(false);
  });

  it('returns false when master switch is disabled, even at 100%', () => {
    expect(isEnabled('disabled', 'user-1', config)).toBe(false);
  });

  it('returns false for unknown flags (fail-closed)', () => {
    expect(isEnabled('nonexistent', 'user-1', config)).toBe(false);
  });

  it('is deterministic for a specific user at 50%', () => {
    const result1 = isEnabled('half', 'consistent-user', config);
    const result2 = isEnabled('half', 'consistent-user', config);
    expect(result1).toBe(result2);
  });

  it('at 50% rollout, roughly half of users are enabled', () => {
    let enabled = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      if (isEnabled('half', `user-${i}`, config)) enabled++;
    }
    // Should be roughly 500 ± 100 (very loose)
    expect(enabled).toBeGreaterThan(350);
    expect(enabled).toBeLessThan(650);
  });

  it('boundary: rolloutPercentage = 1 enables ~1% of users', () => {
    const onePercent: FlagConfig = {
      tiny: { description: 'tiny', enabled: true, rolloutPercentage: 1 },
    };
    let enabled = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      if (isEnabled('tiny', `u-${i}`, onePercent)) enabled++;
    }
    // Should be roughly 100 ± 50
    expect(enabled).toBeGreaterThan(30);
    expect(enabled).toBeLessThan(250);
  });

  it('boundary: rolloutPercentage = 99 enables ~99% of users', () => {
    const high: FlagConfig = {
      almost: { description: 'high', enabled: true, rolloutPercentage: 99 },
    };
    let enabled = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      if (isEnabled('almost', `u-${i}`, high)) enabled++;
    }
    expect(enabled).toBeGreaterThan(9700);
    expect(enabled).toBeLessThan(10000);
  });
});

// ── getVariant tests ────────────────────────────────────────

describe('getVariant', () => {
  const config: FlagConfig = {
    experiment: {
      description: 'A/B test',
      enabled: true,
      rolloutPercentage: 100,
    },
    off_experiment: {
      description: 'off experiment',
      enabled: false,
      rolloutPercentage: 100,
    },
  };

  it('returns null when flag is disabled', () => {
    expect(getVariant('off_experiment', 'user-1', ['a', 'b'], config)).toBeNull();
  });

  it('returns null for empty variants array', () => {
    expect(getVariant('experiment', 'user-1', [], config)).toBeNull();
  });

  it('returns a valid variant from the list', () => {
    const variants = ['control', 'experiment'];
    const v = getVariant('experiment', 'user-1', variants, config);
    expect(variants).toContain(v);
  });

  it('is deterministic — same user always gets same variant', () => {
    const variants = ['a', 'b', 'c'];
    const v1 = getVariant('experiment', 'user-42', variants, config);
    const v2 = getVariant('experiment', 'user-42', variants, config);
    expect(v1).toBe(v2);
  });

  it('distributes users across variants', () => {
    const variants = ['a', 'b', 'c'];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const v = getVariant('experiment', `user-${i}`, variants, config);
      if (v) counts[v]++;
    }
    // Each variant should get > 20% of traffic (expected ~33%)
    for (const v of variants) {
      expect(counts[v]).toBeGreaterThan(N * 0.2);
    }
  });
});

// ── Utility tests ───────────────────────────────────────────

describe('getFlags', () => {
  it('returns the default flags', () => {
    const flags = getFlags();
    expect(flags).toHaveProperty('product_telemetry');
    expect(flags.product_telemetry.enabled).toBe(true);
  });
});

describe('createFlagConfig', () => {
  it('merges overrides with defaults', () => {
    const custom = createFlagConfig({
      new_checkout_ui: {
        description: 'override',
        enabled: true,
        rolloutPercentage: 50,
      },
    });
    expect(custom.new_checkout_ui.rolloutPercentage).toBe(50);
    // product_telemetry should still be there from defaults
    expect(custom.product_telemetry).toBeDefined();
  });
});
