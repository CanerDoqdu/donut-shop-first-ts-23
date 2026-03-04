/**
 * One-time script: Reset all product stocks to their seed values.
 *
 * Usage:  node scripts/reset-stocks.cjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

// ── Read .env.local ───────────────────────────────────────
async function loadEnv() {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found at ' + envPath);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// ── Seed stock values (same as 015_seed_products.sql) ──────
const stockValues = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', slug: 'strawberry-glazed',      stock: 25 },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', slug: 'chocolate-dream',        stock: 20 },
  { id: 'a1b2c3d4-0003-4000-8000-000000000003', slug: 'classic-sugar',          stock: 30 },
  { id: 'a1b2c3d4-0004-4000-8000-000000000004', slug: 'caramel-delight',        stock: 15 },
  { id: 'a1b2c3d4-0005-4000-8000-000000000005', slug: 'rainbow-sprinkles',      stock: 28 },
  { id: 'a1b2c3d4-0006-4000-8000-000000000006', slug: 'vanilla-cream',          stock: 22 },
  { id: 'a1b2c3d4-0007-4000-8000-000000000007', slug: 'maple-bacon',            stock: 12 },
  { id: 'a1b2c3d4-0008-4000-8000-000000000008', slug: 'pumpkin-spice',          stock: 18 },
  { id: 'a1b2c3d4-0009-4000-8000-000000000009', slug: 'berry-bliss-smoothie',   stock: 50 },
  { id: 'a1b2c3d4-0010-4000-8000-000000000010', slug: 'chocolate-milkshake',    stock: 40 },
  { id: 'a1b2c3d4-0011-4000-8000-000000000011', slug: 'caramel-frappe',         stock: 35 },
  { id: 'a1b2c3d4-0012-4000-8000-000000000012', slug: 'strawberry-lemonade',    stock: 60 },
  { id: 'a1b2c3d4-0013-4000-8000-000000000013', slug: 'vanilla-iced-latte',     stock: 45 },
  { id: 'a1b2c3d4-0014-4000-8000-000000000014', slug: 'mango-passion-smoothie', stock: 38 },
  { id: 'a1b2c3d4-0015-4000-8000-000000000015', slug: 'iced-mocha',             stock: 42 },
  { id: 'a1b2c3d4-0016-4000-8000-000000000016', slug: 'pink-cloud-shake',       stock: 30 },
];

async function main() {
  const env = await loadEnv();

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local');

  // Use the REST API directly (no need to import supabase-js in CJS context)
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  console.log('🔄 Resetting product stocks...\n');

  let success = 0;
  let failed = 0;

  for (const product of stockValues) {
    const res = await fetch(
      `${url}/rest/v1/products?id=eq.${product.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ stock: product.stock, updated_at: new Date().toISOString() }),
      }
    );

    if (res.ok) {
      console.log(`  ✅ ${product.slug.padEnd(25)} → stock: ${product.stock}`);
      success++;
    } else {
      const text = await res.text();
      console.log(`  ❌ ${product.slug.padEnd(25)} → FAILED: ${res.status} ${text}`);
      failed++;
    }
  }

  console.log(`\n📊 Sonuç: ${success} başarılı, ${failed} başarısız`);

  if (failed === 0) {
    console.log('✅ Tüm stoklar başarıyla yenilendi!');
  } else {
    console.log('⚠️  Bazı ürünler güncellenemedi. Yukarıdaki hataları kontrol edin.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('💥 Script hatası:', err.message);
  process.exit(1);
});
