/**
 * One-time script: Fix product image_url values in Supabase.
 * Usage: node scripts/fix-product-images.cjs
 */

async function loadEnv() {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('.env.local not found');

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const imageMap = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', slug: 'strawberry-glazed', image_url: '/donut 4.png' },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', slug: 'chocolate-dream', image_url: '/donut 5.png' },
  { id: 'a1b2c3d4-0003-4000-8000-000000000003', slug: 'classic-sugar', image_url: '/donut 6.png' },
  { id: 'a1b2c3d4-0004-4000-8000-000000000004', slug: 'caramel-delight', image_url: '/donut 6 (2).png' },
  { id: 'a1b2c3d4-0005-4000-8000-000000000005', slug: 'rainbow-sprinkles', image_url: '/9877db2dcff20bf4feec3349824f74e3.png' },
  { id: 'a1b2c3d4-0006-4000-8000-000000000006', slug: 'vanilla-cream', image_url: '/a0f87c462026bee95d2ccf126b9bc60a.png' },
  { id: 'a1b2c3d4-0007-4000-8000-000000000007', slug: 'maple-bacon', image_url: '/donut (3).png' },
  { id: 'a1b2c3d4-0008-4000-8000-000000000008', slug: 'pumpkin-spice', image_url: '/e7477fc5ceac0d47e8eade2ff3d7354c.png' },
  { id: 'a1b2c3d4-0009-4000-8000-000000000009', slug: 'berry-bliss-smoothie', image_url: '/beverage 1.png' },
  { id: 'a1b2c3d4-0010-4000-8000-000000000010', slug: 'chocolate-milkshake', image_url: '/beverage 2.png' },
  { id: 'a1b2c3d4-0011-4000-8000-000000000011', slug: 'caramel-frappe', image_url: '/beverage 3.png' },
  { id: 'a1b2c3d4-0012-4000-8000-000000000012', slug: 'strawberry-lemonade', image_url: '/beverage 4.png' },
  { id: 'a1b2c3d4-0013-4000-8000-000000000013', slug: 'vanilla-iced-latte', image_url: '/beverage 5.png' },
  { id: 'a1b2c3d4-0014-4000-8000-000000000014', slug: 'mango-passion-smoothie', image_url: '/beverage 6.png' },
  { id: 'a1b2c3d4-0015-4000-8000-000000000015', slug: 'iced-mocha', image_url: '/beverage 7.png' },
  { id: 'a1b2c3d4-0016-4000-8000-000000000016', slug: 'pink-cloud-shake', image_url: '/beverage 18.png' },
];

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  console.log('🖼️ Fixing product image_url values...\n');

  let okCount = 0;
  let failCount = 0;

  for (const product of imageMap) {
    const res = await fetch(`${url}/rest/v1/products?id=eq.${product.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ image_url: product.image_url, updated_at: new Date().toISOString() }),
    });

    if (res.ok) {
      console.log(`  ✅ ${product.slug.padEnd(25)} → ${product.image_url}`);
      okCount++;
    } else {
      const text = await res.text();
      console.log(`  ❌ ${product.slug.padEnd(25)} → FAILED: ${res.status} ${text}`);
      failCount++;
    }
  }

  console.log(`\n📊 Sonuç: ${okCount} başarılı, ${failCount} başarısız`);
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error('💥 Script hatası:', err.message);
  process.exit(1);
});
