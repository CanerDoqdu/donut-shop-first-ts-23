import { describe, it, expect, vi } from 'vitest';
import {
  runBatchMigration,
  runValidation,
  dualWriteStripeSession,
  readStripeSession,
  createStripeSessionV2Checks,
  createStripeSessionV2Executor,
  type MigrationResult,
  type BatchResult,
  type ValidationResult,
} from '@/lib/migration';

// ── Suppress logger output in tests ──────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    withContext: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// =============================================
// runBatchMigration
// =============================================
describe('runBatchMigration', () => {
  it('runs batches until executor returns 0', async () => {
    let calls = 0;
    const executor = vi.fn(async (_batchSize: number) => {
      calls++;
      return calls <= 3 ? 100 : 0; // 3 batches of 100, then done
    });

    const result = await runBatchMigration(executor, {
      id: 'test_migration',
      batchSize: 100,
      delayMs: 0,
    });

    expect(result.success).toBe(true);
    expect(result.totalMigrated).toBe(300);
    expect(result.batchesRun).toBe(4); // 3 data + 1 empty
    expect(executor).toHaveBeenCalledTimes(4);
  });

  it('respects maxBatches limit', async () => {
    const executor = vi.fn(async () => 50);

    const result = await runBatchMigration(executor, {
      id: 'test_limited',
      batchSize: 100,
      maxBatches: 2,
      delayMs: 0,
    });

    expect(result.success).toBe(true);
    expect(result.totalMigrated).toBe(100);
    expect(result.batchesRun).toBe(2);
  });

  it('calls progress callback after each batch', async () => {
    let calls = 0;
    const executor = async () => {
      calls++;
      return calls <= 2 ? 50 : 0;
    };

    const progress: BatchResult[] = [];
    await runBatchMigration(
      executor,
      { id: 'test_progress', batchSize: 50, delayMs: 0 },
      (result) => progress.push(result),
    );

    expect(progress).toHaveLength(3);
    expect(progress[0].batchNumber).toBe(1);
    expect(progress[0].rowsAffected).toBe(50);
    expect(progress[0].totalMigrated).toBe(50);
    expect(progress[1].batchNumber).toBe(2);
    expect(progress[1].totalMigrated).toBe(100);
    expect(progress[2].batchNumber).toBe(3);
    expect(progress[2].rowsAffected).toBe(0);
  });

  it('returns failure on executor error', async () => {
    const executor = vi.fn(async () => {
      throw new Error('DB connection failed');
    });

    const result = await runBatchMigration(executor, {
      id: 'test_error',
      delayMs: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB connection failed');
    expect(result.totalMigrated).toBe(0);
    expect(result.batchesRun).toBe(0);
  });

  it('handles mid-batch failure gracefully', async () => {
    let calls = 0;
    const executor = vi.fn(async () => {
      calls++;
      if (calls === 3) throw new Error('Timeout');
      return 100;
    });

    const result = await runBatchMigration(executor, {
      id: 'test_mid_fail',
      delayMs: 0,
    });

    expect(result.success).toBe(false);
    expect(result.totalMigrated).toBe(200); // 2 successful batches
    expect(result.batchesRun).toBe(2);
    expect(result.error).toBe('Timeout');
  });

  it('uses default config when none provided', async () => {
    const executor = vi.fn(async () => 0);

    const result = await runBatchMigration(executor);

    expect(result.success).toBe(true);
    expect(result.batchesRun).toBe(1);
    expect(executor).toHaveBeenCalledWith(1000); // default batchSize
  });

  it('respects delay between batches', async () => {
    let calls = 0;
    const executor = vi.fn(async () => {
      calls++;
      return calls <= 1 ? 10 : 0;
    });

    const start = Date.now();
    await runBatchMigration(executor, {
      id: 'test_delay',
      delayMs: 50,
    });
    const elapsed = Date.now() - start;

    // Should have delayed at least 50ms between batches
    expect(elapsed).toBeGreaterThanOrEqual(40); // allow small timing tolerance
  });

  it('handles zero rows from first batch', async () => {
    const executor = vi.fn(async () => 0);

    const result = await runBatchMigration(executor, {
      id: 'test_empty',
      delayMs: 0,
    });

    expect(result.success).toBe(true);
    expect(result.totalMigrated).toBe(0);
    expect(result.batchesRun).toBe(1);
  });

  it('handles non-Error throw (string) gracefully', async () => {
    const executor = vi.fn(async () => {
      throw 'raw string error';
    });

    const result = await runBatchMigration(executor, {
      id: 'test_non_error_throw',
      delayMs: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('raw string error');
  });
});

// =============================================
// runValidation
// =============================================
describe('runValidation', () => {
  it('passes when all checks pass', async () => {
    const checks = [
      async () => ({ name: 'check1', passed: true, message: 'OK' }),
      async () => ({ name: 'check2', passed: true, message: 'OK' }),
    ];

    const result = await runValidation(checks);

    expect(result.valid).toBe(true);
    expect(result.checks).toHaveLength(2);
  });

  it('fails when any check fails', async () => {
    const checks = [
      async () => ({ name: 'check1', passed: true, message: 'OK' }),
      async () => ({ name: 'check2', passed: false, message: '5 rows unmigrated' }),
    ];

    const result = await runValidation(checks);

    expect(result.valid).toBe(false);
    expect(result.checks[1].passed).toBe(false);
  });

  it('catches thrown errors in checks', async () => {
    const checks = [
      async () => { throw new Error('Query failed'); },
    ];

    const result = await runValidation(checks);

    expect(result.valid).toBe(false);
    expect(result.checks[0].message).toContain('Query failed');
  });

  it('handles empty check list', async () => {
    const result = await runValidation([]);

    expect(result.valid).toBe(true);
    expect(result.checks).toHaveLength(0);
  });

  it('catches non-Error thrown value in checks', async () => {
    const checks = [
      async () => {
        throw 'string error from check';
      },
    ];

    const result = await runValidation(checks as never);

    expect(result.valid).toBe(false);
    expect(result.checks[0].message).toContain('string error from check');
    expect(result.checks[0].passed).toBe(false);
  });
});

// =============================================
// dualWriteStripeSession
// =============================================
describe('dualWriteStripeSession', () => {
  it('writes to both columns', () => {
    const result = dualWriteStripeSession('cs_test_abc123');

    expect(result).toEqual({
      stripe_session_id: 'cs_test_abc123',
      stripe_session_v2: 'cs_test_abc123',
    });
  });

  it('handles null session ID', () => {
    const result = dualWriteStripeSession(null);

    expect(result).toEqual({
      stripe_session_id: null,
      stripe_session_v2: null,
    });
  });
});

// =============================================
// readStripeSession
// =============================================
describe('readStripeSession', () => {
  it('prefers v2 column when available', () => {
    const result = readStripeSession({
      stripe_session_v2: 'cs_v2_value',
      stripe_session_id: 'cs_v1_value',
    });

    expect(result).toBe('cs_v2_value');
  });

  it('falls back to v1 when v2 is null', () => {
    const result = readStripeSession({
      stripe_session_v2: null,
      stripe_session_id: 'cs_v1_value',
    });

    expect(result).toBe('cs_v1_value');
  });

  it('falls back to v1 when v2 is undefined', () => {
    const result = readStripeSession({
      stripe_session_id: 'cs_v1_only',
    });

    expect(result).toBe('cs_v1_only');
  });

  it('returns null when both are absent', () => {
    const result = readStripeSession({});

    expect(result).toBeNull();
  });

  it('returns null when both are null', () => {
    const result = readStripeSession({
      stripe_session_v2: null,
      stripe_session_id: null,
    });

    expect(result).toBeNull();
  });
});

// =============================================
// createStripeSessionV2Checks
// =============================================
describe('createStripeSessionV2Checks', () => {
  it('creates validation checks from query functions', async () => {
    const checks = createStripeSessionV2Checks({
      countUnmigrated: async () => 0,
      countInvalid: async () => 0,
      countTotal: async () => 500,
    });

    expect(checks).toHaveLength(3);

    const result = await runValidation(checks);
    expect(result.valid).toBe(true);
    expect(result.checks[0].name).toBe('no_unmigrated_rows');
    expect(result.checks[0].message).toBe('All rows migrated');
    expect(result.checks[1].name).toBe('no_invalid_values');
    expect(result.checks[2].name).toBe('row_count_consistent');
    expect(result.checks[2].value).toBe(500);
  });

  it('reports unmigrated rows', async () => {
    const checks = createStripeSessionV2Checks({
      countUnmigrated: async () => 42,
      countInvalid: async () => 0,
      countTotal: async () => 500,
    });

    const result = await runValidation(checks);
    expect(result.valid).toBe(false);
    expect(result.checks[0].passed).toBe(false);
    expect(result.checks[0].message).toContain('42 rows still unmigrated');
  });

  it('reports invalid values', async () => {
    const checks = createStripeSessionV2Checks({
      countUnmigrated: async () => 0,
      countInvalid: async () => 3,
      countTotal: async () => 500,
    });

    const result = await runValidation(checks);
    expect(result.valid).toBe(false);
    expect(result.checks[1].passed).toBe(false);
    expect(result.checks[1].message).toContain('3 rows have invalid');
  });
});

// =============================================
// createStripeSessionV2Executor
// =============================================
describe('createStripeSessionV2Executor', () => {
  it('wraps rpcFn as a BatchExecutor', async () => {
    const rpcFn = vi.fn(async (batchSize: number) => batchSize * 2);
    const executor = createStripeSessionV2Executor(rpcFn);

    const result = await executor(50);

    expect(result).toBe(100);
    expect(rpcFn).toHaveBeenCalledWith(50);
  });

  it('works end-to-end with runBatchMigration', async () => {
    let calls = 0;
    const rpcFn = async (_batchSize: number) => {
      calls++;
      return calls <= 1 ? 25 : 0;
    };

    const executor = createStripeSessionV2Executor(rpcFn);
    const result = await runBatchMigration(executor, {
      id: 'test_v2_executor',
      batchSize: 25,
      delayMs: 0,
    });

    expect(result.success).toBe(true);
    expect(result.totalMigrated).toBe(25);
  });
});
