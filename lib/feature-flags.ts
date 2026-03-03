/**
 * Progressive Delivery — Feature Flags & Canary Rollout
 *
 * Deterministic percentage-based feature flag system with:
 *  - User/request hash bucketing (0-99) for consistent rollout
 *  - On/off switch + percentage rollout (0-100)
 *  - Variant support (A/B/C) for experiments
 *  - No external dependency — runs in-process
 *
 * Usage:
 *   import { flags, isEnabled, getVariant } from '@/lib/feature-flags';
 *
 *   // Simple on/off
 *   if (isEnabled('new_checkout_ui', userId)) { ... }
 *
 *   // Variant (A/B experiment)
 *   const v = getVariant('checkout_flow', userId, ['control', 'experiment']);
 *
 * Design:
 *  - FNV-1a hash for fast, even distribution
 *  - Deterministic: same userId always gets same bucket → stable UX
 *  - Serialisable config → easy to drive from env/DB later
 */

// ── Types ───────────────────────────────────────────────────

export interface FlagDefinition {
  /** Human-readable description */
  description: string;
  /** Master switch — if false, flag is always off regardless of rollout */
  enabled: boolean;
  /** Percentage of traffic to receive the feature (0-100) */
  rolloutPercentage: number;
}

export interface FlagConfig {
  [flagName: string]: FlagDefinition;
}

// ── Default flag registry ───────────────────────────────────

const defaultFlags: FlagConfig = {
  new_checkout_ui: {
    description: 'Canary rollout for redesigned checkout page',
    enabled: true,
    rolloutPercentage: 0, // 0% — fully off until graduated
  },
  product_telemetry: {
    description: 'Product funnel telemetry events',
    enabled: true,
    rolloutPercentage: 100, // 100% — on for all traffic
  },
  enhanced_search: {
    description: 'Enhanced search with fuzzy matching',
    enabled: false,
    rolloutPercentage: 0,
  },
};

// ── FNV-1a hash (32-bit) ───────────────────────────────────
// Fast non-cryptographic hash with good distribution.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1aHash(input: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Ensure unsigned 32-bit
  return hash >>> 0;
}

// ── Core logic ──────────────────────────────────────────────

/**
 * Compute a deterministic bucket (0-99) for a given flag + identifier.
 * Same (flag, id) pair always returns the same bucket.
 */
export function getBucket(flagName: string, identifier: string): number {
  const hash = fnv1aHash(`${flagName}:${identifier}`);
  return hash % 100;
}

/**
 * Check whether a feature flag is enabled for a given identifier.
 *
 * @param flagName - registered flag key
 * @param identifier - userId, requestId, or sessionId
 * @param overrides - optional config overrides (testing / env-driven)
 * @returns true if identifier falls within rollout percentage
 */
export function isEnabled(
  flagName: string,
  identifier: string,
  overrides?: FlagConfig,
): boolean {
  const config = overrides ?? defaultFlags;
  const flag = config[flagName];

  // Unknown flag → off (fail-closed)
  if (!flag) return false;

  // Master switch off → always off
  if (!flag.enabled) return false;

  // 0% → always off, 100% → always on (fast path)
  if (flag.rolloutPercentage <= 0) return false;
  if (flag.rolloutPercentage >= 100) return true;

  const bucket = getBucket(flagName, identifier);
  return bucket < flag.rolloutPercentage;
}

/**
 * Get a variant assignment for multi-variant experiments.
 *
 * Distributes identifiers evenly across the provided variants.
 * Only assigns a variant if the flag is enabled for this identifier.
 *
 * @returns variant string or null (if flag is off for this user)
 */
export function getVariant(
  flagName: string,
  identifier: string,
  variants: string[],
  overrides?: FlagConfig,
): string | null {
  if (!isEnabled(flagName, identifier, overrides)) return null;
  if (variants.length === 0) return null;

  const hash = fnv1aHash(`${flagName}:variant:${identifier}`);
  const index = hash % variants.length;
  return variants[index]!;
}

/**
 * Get the current default flag registry (read-only snapshot).
 */
export function getFlags(): Readonly<FlagConfig> {
  return { ...defaultFlags };
}

/**
 * Create a custom flag config from partial overrides on top of defaults.
 * Useful for tests or environment-specific configs.
 */
export function createFlagConfig(overrides: Partial<FlagConfig>): FlagConfig {
  const merged: FlagConfig = { ...defaultFlags };
  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      merged[key] = { ...merged[key]!, ...value };
    }
  }
  return merged;
}
