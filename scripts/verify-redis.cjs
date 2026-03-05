#!/usr/bin/env node
/**
 * scripts/verify-redis.cjs
 *
 * Verifies Upstash Redis connectivity and configuration.
 * Usage: node scripts/verify-redis.cjs
 *
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ Missing environment variables:');
    if (!url) console.error('   - UPSTASH_REDIS_REST_URL');
    if (!token) console.error('   - UPSTASH_REDIS_REST_TOKEN');
    console.error('');
    console.error('Set these in .env.local or your production environment (Vercel).');
    process.exit(1);
  }

  console.log('Checking Upstash Redis connectivity...');
  console.log(`  URL: ${url.replace(/\/\/(.{4}).*@/, '//$1***@')}`);

  try {
    // PING
    const pingRes = await fetch(`${url}/PING`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pingData = await pingRes.json();
    if (pingData.result !== 'PONG') {
      throw new Error(`PING returned: ${JSON.stringify(pingData)}`);
    }
    console.log('  ✅ PING → PONG');

    // SET/GET test
    const testKey = '__donut_shop_verify__';
    const testVal = `verify-${Date.now()}`;
    
    await fetch(`${url}/SET/${testKey}/${testVal}/EX/10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const getRes = await fetch(`${url}/GET/${testKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getData = await getRes.json();
    
    if (getData.result !== testVal) {
      throw new Error(`GET returned ${getData.result}, expected ${testVal}`);
    }
    console.log('  ✅ SET/GET → working');

    // Cleanup
    await fetch(`${url}/DEL/${testKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('  ✅ DEL → cleaned up');

    // INFO
    const infoRes = await fetch(`${url}/INFO`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const infoData = await infoRes.json();
    console.log('  ✅ INFO → Redis server responding');
    
    console.log('\n✅ Upstash Redis: All checks passed.');
  } catch (error) {
    console.error(`\n❌ Redis verification failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main().catch(console.error);
