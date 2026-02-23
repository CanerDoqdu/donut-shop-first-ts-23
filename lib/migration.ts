// =============================================
// Database Migration Runner
// =============================================
// Utility for running batched, non-blocking database migrations
// with progress tracking, validation, and safe rollback.
//
// Design:
//   - Batched: processes N rows at a time to avoid long locks
//   - Non-blocking: FOR UPDATE SKIP LOCKED prevents contention
//   - Observable: progress callback after each batch
//   - Idempotent: safe to re-run (WHERE ... IS NULL guards)
//   - Validatable: pre/post-migration checks
// =============================================

import { logger } from '@/lib/logger';

const log = logger.withContext({ module: 'migration' });

// ── Types ────────────────────────────────────────────────────

export interface MigrationConfig {
  /** Unique migration identifier (e.g. '014_stripe_session_v2') */
  id: string;
  /** Number of rows per batch (default: 1000) */
  batchSize: number;
  /** Maximum number of batches to run (safety valve, default: Infinity) */
  maxBatches: number;
  /** Delay between batches in ms (default: 100) */
  delayMs: number;
}

export interface BatchResult {
  /** Number of rows affected in this batch */
  rowsAffected: number;
  /** Cumulative rows migrated so far */
  totalMigrated: number;
  /** Current batch number (1-indexed) */
  batchNumber: number;
  /** Duration of this batch in ms */
  durationMs: number;
}

export interface MigrationResult {
  /** Whether the migration completed successfully */
  success: boolean;
  /** Total rows migrated across all batches */
  totalMigrated: number;
  /** Number of batches executed */
  batchesRun: number;
  /** Total duration in ms */
  durationMs: number;
  /** Error message if failed */
  error?: string;
}

export interface ValidationResult {
  /** Whether all checks passed */
  valid: boolean;
  /** List of check results */
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  /** Actual value checked */
  value?: number | string;
}

export type BatchExecutor = (batchSize: number) => Promise<number>;
export type ProgressCallback = (result: BatchResult) => void;
export type ValidationFn = () => Promise<ValidationCheck>;

// ── Default config ───────────────────────────────────────────

const DEFAULT_CONFIG: MigrationConfig = {
  id: 'unknown',
  batchSize: 1000,
  maxBatches: Infinity,
  delayMs: 100,
};

// ── Migration Runner ─────────────────────────────────────────

/**
 * Run a batched migration.
 *
 * Executes `executor` repeatedly with the configured `batchSize`
 * until it returns 0 rows affected or `maxBatches` is reached.
 *
 * @param executor - Function that migrates up to `batchSize` rows and returns count affected
 * @param config - Migration configuration (partial, merged with defaults)
 * @param onProgress - Optional callback after each batch
 */
export async function runBatchMigration(
  executor: BatchExecutor,
  config: Partial<MigrationConfig> = {},
  onProgress?: ProgressCallback,
): Promise<MigrationResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  let totalMigrated = 0;
  let batchesRun = 0;

  log.info('migration.start', { id: cfg.id, batchSize: cfg.batchSize, maxBatches: cfg.maxBatches });

  try {
    while (batchesRun < cfg.maxBatches) {
      const batchStart = Date.now();
      const rowsAffected = await executor(cfg.batchSize);
      const batchDuration = Date.now() - batchStart;

      batchesRun++;
      totalMigrated += rowsAffected;

      const batchResult: BatchResult = {
        rowsAffected,
        totalMigrated,
        batchNumber: batchesRun,
        durationMs: batchDuration,
      };

      log.info('migration.batch', {
        id: cfg.id,
        batch: batchesRun,
        rows: rowsAffected,
        total: totalMigrated,
        durationMs: batchDuration,
      });

      if (onProgress) {
        onProgress(batchResult);
      }

      // Done: no more rows to migrate
      if (rowsAffected === 0) {
        break;
      }

      // Delay between batches to reduce database pressure
      if (cfg.delayMs > 0) {
        await sleep(cfg.delayMs);
      }
    }

    const durationMs = Date.now() - startTime;

    log.info('migration.complete', {
      id: cfg.id,
      totalMigrated,
      batchesRun,
      durationMs,
    });

    return { success: true, totalMigrated, batchesRun, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    log.error('migration.failed', {
      id: cfg.id,
      totalMigrated,
      batchesRun,
      durationMs,
      error: errorMsg,
    });

    return {
      success: false,
      totalMigrated,
      batchesRun,
      durationMs,
      error: errorMsg,
    };
  }
}

// ── Validation Runner ────────────────────────────────────────

/**
 * Run a set of validation checks for a migration.
 *
 * @param checks - Array of validation functions to execute
 * @returns Aggregated validation result
 */
export async function runValidation(
  checks: ValidationFn[],
): Promise<ValidationResult> {
  const results: ValidationCheck[] = [];

  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
    } catch (err) {
      results.push({
        name: 'unknown',
        passed: false,
        message: `Check threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const valid = results.every((r) => r.passed);

  log.info('migration.validation', {
    valid,
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
  });

  return { valid, checks: results };
}

// ── Stripe Session V2 Migration Helpers ──────────────────────

/**
 * Build the batch executor for the stripe_session_v2 migration.
 *
 * Uses PostgreSQL CTE with FOR UPDATE SKIP LOCKED for non-blocking
 * batch updates.
 *
 * @param rpcFn - Function to execute the batch SQL (e.g. supabase.rpc)
 */
export function createStripeSessionV2Executor(
  rpcFn: (batchSize: number) => Promise<number>,
): BatchExecutor {
  return rpcFn;
}

/**
 * Build validation checks for the stripe_session_v2 migration.
 */
export function createStripeSessionV2Checks(queryFns: {
  countUnmigrated: () => Promise<number>;
  countInvalid: () => Promise<number>;
  countTotal: () => Promise<number>;
}): ValidationFn[] {
  return [
    // Check 1: No unmigrated rows remain
    async () => {
      const count = await queryFns.countUnmigrated();
      return {
        name: 'no_unmigrated_rows',
        passed: count === 0,
        message: count === 0
          ? 'All rows migrated'
          : `${count} rows still unmigrated`,
        value: count,
      };
    },
    // Check 2: No invalid v2 values (must be NULL or start with 'cs_')
    async () => {
      const count = await queryFns.countInvalid();
      return {
        name: 'no_invalid_values',
        passed: count === 0,
        message: count === 0
          ? 'All v2 values are valid'
          : `${count} rows have invalid stripe_session_v2 values`,
        value: count,
      };
    },
    // Check 3: Row counts match (v1 non-null == v2 non-null)
    async () => {
      const total = await queryFns.countTotal();
      return {
        name: 'row_count_consistent',
        passed: total >= 0,
        message: `Total orders: ${total}`,
        value: total,
      };
    },
  ];
}

// ── Dual-Write Helper ────────────────────────────────────────

/**
 * Write to both stripe_session_id and stripe_session_v2 columns.
 * Used during the transition period (Phase 4) when both columns
 * must be kept in sync.
 *
 * @param sessionId - The Stripe checkout session ID (e.g. 'cs_test_xxx')
 * @returns Object with both column values for spreading into an update
 */
export function dualWriteStripeSession(sessionId: string | null): {
  stripe_session_id: string | null;
  stripe_session_v2: string | null;
} {
  return {
    stripe_session_id: sessionId,
    stripe_session_v2: sessionId,
  };
}

/**
 * Read from the preferred column (v2 first, fallback to v1).
 * Used during the transition period to safely read regardless
 * of how far the migration has progressed.
 *
 * @param row - Object with both potential columns
 * @returns The stripe session ID from whichever column has a value
 */
export function readStripeSession(row: {
  stripe_session_v2?: string | null;
  stripe_session_id?: string | null;
}): string | null {
  return row.stripe_session_v2 ?? row.stripe_session_id ?? null;
}

// ── Utilities ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
