#!/usr/bin/env node
/**
 * scripts/apply-migrations.cjs
 *
 * Applies pending Supabase migrations via the Management API.
 * Usage: node scripts/apply-migrations.cjs
 *
 * Requires: SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * or as environment variables.
 *
 * For manual application, copy the SQL from supabase/migrations/*.sql
 * and run it in the Supabase Dashboard SQL Editor.
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Ordered list of pending migrations to apply
const PENDING_MIGRATIONS = [
  '021_fix_admin_rls_and_signup_trigger.sql',
  '022_harden_admin_role_boundary.sql',
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    console.error('');
    console.error('Manual fallback:');
    console.error('  1. Open Supabase Dashboard → SQL Editor');
    console.error('  2. Paste and run each migration file in order:');
    for (const m of PENDING_MIGRATIONS) {
      console.error(`     - supabase/migrations/${m}`);
    }
    process.exit(1);
  }

  for (const migration of PENDING_MIGRATIONS) {
    const filePath = path.join(MIGRATIONS_DIR, migration);
    if (!fs.existsSync(filePath)) {
      console.warn(`SKIP: ${migration} not found`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Applying: ${migration} ...`);

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      // NOTE: The above is a placeholder — Supabase REST API does not expose
      // raw SQL execution. Use one of:
      // 1. `supabase db push` via CLI
      // 2. Supabase Dashboard SQL Editor
      // 3. Direct PostgreSQL connection string
    });

    // Since REST API can't run raw SQL, guide the user:
    console.log(`\n⚠️  Supabase REST API does not support raw SQL execution.`);
    console.log(`    Apply "${migration}" via one of:`);
    console.log(`    1. supabase db push (if Supabase CLI is installed)`);
    console.log(`    2. Supabase Dashboard → SQL Editor → paste contents`);
    console.log(`    3. psql connection: psql "$DATABASE_URL" < ${filePath}\n`);
  }

  console.log('Done. Run the validate scripts after applying:');
  console.log('  - supabase/migrations/022_harden_admin_role_boundary_validate.sql');
}

main().catch(console.error);
