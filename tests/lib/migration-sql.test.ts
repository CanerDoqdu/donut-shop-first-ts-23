import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =============================================
// SQL Migration File Validation Tests
// =============================================
// These tests validate that:
//   1. All migration files exist and are non-empty
//   2. SQL files follow safe migration patterns
//   3. Migration + rollback + validate form a complete set
//   4. No MySQL-only syntax leaks through
//   5. Idempotent DDL (IF NOT EXISTS / IF EXISTS)
// =============================================

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function readMigration(filename: string): string {
  const filePath = join(MIGRATIONS_DIR, filename);
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf-8');
}

describe('014_stripe_session_v2 migration files', () => {
  const migration = readMigration('014_stripe_session_v2.sql');
  const rollback = readMigration('014_stripe_session_v2_rollback.sql');
  const validate = readMigration('014_stripe_session_v2_validate.sql');

  // ── File existence ─────────────────────────────────────────

  it('migration file exists and is non-empty', () => {
    expect(migration.length).toBeGreaterThan(0);
  });

  it('rollback file exists and is non-empty', () => {
    expect(rollback.length).toBeGreaterThan(0);
  });

  it('validate file exists and is non-empty', () => {
    expect(validate.length).toBeGreaterThan(0);
  });

  // ── PostgreSQL correctness ─────────────────────────────────

  it('migration uses IF NOT EXISTS for ADD COLUMN', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS stripe_session_v2');
  });

  it('rollback uses IF EXISTS for DROP COLUMN', () => {
    expect(rollback).toContain('DROP COLUMN IF EXISTS stripe_session_v2');
  });

  it('migration does NOT use MySQL UPDATE ... LIMIT syntax', () => {
    // MySQL: UPDATE table SET ... LIMIT N
    // PostgreSQL uses CTE with LIMIT inside subquery
    const mysqlPattern = /UPDATE\s+orders\s+SET\s+.*LIMIT/i;
    expect(migration).not.toMatch(mysqlPattern);
  });

  it('migration uses PostgreSQL CTE batch pattern', () => {
    expect(migration).toContain('WITH batch AS');
    expect(migration).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('migration does NOT use CREATE PROCEDURE (MySQL/SQL Server)', () => {
    expect(migration.toUpperCase()).not.toContain('CREATE PROCEDURE');
  });

  // ── Safe migration patterns ────────────────────────────────

  it('migration uses NOT VALID for CHECK constraint', () => {
    // NOT VALID means: validate new rows immediately, skip existing rows
    // This avoids a full-table scan during ALTER TABLE
    expect(migration).toContain('NOT VALID');
  });

  it('validate file validates the constraint', () => {
    expect(validate).toContain('VALIDATE CONSTRAINT chk_stripe_session_v2_format');
  });

  it('migration wraps DDL in transaction', () => {
    expect(migration).toContain('BEGIN;');
    expect(migration).toContain('COMMIT;');
  });

  it('rollback wraps in transaction', () => {
    expect(rollback).toContain('BEGIN;');
    expect(rollback).toContain('COMMIT;');
  });

  it('migration creates partial index', () => {
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_v2');
    expect(migration).toContain('WHERE stripe_session_v2 IS NOT NULL');
  });

  // ── Migration tracking ─────────────────────────────────────

  it('migration creates _migration_progress tracking table', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS _migration_progress');
  });

  it('migration tracks progress with migration id', () => {
    expect(migration).toContain("'014_stripe_session_v2'");
  });

  it('rollback updates tracking status to rolled_back', () => {
    expect(rollback).toContain("'rolled_back'");
  });

  it('validate updates tracking status to completed', () => {
    expect(validate).toContain("'completed'");
  });

  // ── CHECK constraint format ────────────────────────────────

  it('migration adds CHECK constraint for cs_ prefix', () => {
    expect(migration).toContain("stripe_session_v2 LIKE 'cs_%'");
  });

  it('CHECK constraint allows NULL values', () => {
    expect(migration).toContain('stripe_session_v2 IS NULL');
  });

  // ── Rollback safety ────────────────────────────────────────

  it('rollback does NOT touch stripe_session_id (old column)', () => {
    // Rollback should only drop v2, never modify v1
    const rollbackStatements = rollback
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'));

    const modifiesV1 = rollbackStatements.some(
      (line) =>
        line.includes('stripe_session_id') &&
        !line.includes('migration_id'),
    );
    expect(modifiesV1).toBe(false);
  });

  it('rollback is safe — only drops the new column', () => {
    // Should not ALTER any other columns
    const dropStatements = rollback
      .split('\n')
      .filter((line) => /ALTER TABLE.*DROP/i.test(line));

    expect(dropStatements.length).toBe(1);
    expect(dropStatements[0]).toContain('stripe_session_v2');
  });
});

describe('migration file naming conventions', () => {
  it('migration files use sequential numbering', () => {
    expect(existsSync(join(MIGRATIONS_DIR, '014_stripe_session_v2.sql'))).toBe(true);
    expect(existsSync(join(MIGRATIONS_DIR, '014_stripe_session_v2_rollback.sql'))).toBe(true);
    expect(existsSync(join(MIGRATIONS_DIR, '014_stripe_session_v2_validate.sql'))).toBe(true);
  });

  it('rollback file follows _rollback naming convention', () => {
    const rollbackPath = join(MIGRATIONS_DIR, '014_stripe_session_v2_rollback.sql');
    expect(existsSync(rollbackPath)).toBe(true);
  });

  it('validate file follows _validate naming convention', () => {
    const validatePath = join(MIGRATIONS_DIR, '014_stripe_session_v2_validate.sql');
    expect(existsSync(validatePath)).toBe(true);
  });
});
