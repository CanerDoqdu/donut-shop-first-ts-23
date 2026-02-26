async function main() {
  const fs = await import('node:fs');
  const https = await import('node:https');

  const projectUrl = process.env.SUPABASE_PROJECT_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceRoleKey) {
    console.error('Missing required env vars: SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sql = fs.readFileSync('./supabase/migrations/020_fix_search_path.sql', 'utf8');

  const data = JSON.stringify({
    checks: [],
    definition: sql
  });

  const options = {
    hostname: projectUrl,
    port: 443,
    path: '/rest/v1/rpc/postgrest_exec',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Migration 020 applied successfully');
        console.log('Status:', res.statusCode);
      } else {
        console.log('❌ Failed to apply migration');
        console.log('Status:', res.statusCode);
        console.log('Response:', responseData);
      }
    });
  });

  req.on('error', (err) => console.error('Error:', err.message));
  req.write(data);
  req.end();
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
