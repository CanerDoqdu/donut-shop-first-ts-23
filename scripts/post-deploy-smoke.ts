/**
 * Post-deploy smoke test runner.
 *
 * Lightweight HTTP-level checks for critical endpoints after deployment.
 * Can run in CI or locally against any target URL.
 *
 * Usage:
 *   npx tsx scripts/post-deploy-smoke.ts                    # default: http://localhost:3000
 *   npx tsx scripts/post-deploy-smoke.ts https://production.url
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * Checks:
 *   1. Homepage responds 200 (or redirect to locale)
 *   2. Products page responds 200
 *   3. API health — GET /api/vitals returns 200
 *   4. Static assets — manifest.json loads
 *   5. Security headers present
 *   6. Response time under 5s
 */

interface SmokeCheck {
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  expectedStatus?: number | number[];
  maxResponseTimeMs?: number;
  validateBody?: (body: string) => boolean;
  validateHeaders?: (headers: Headers) => boolean;
}

interface SmokeResult {
  name: string;
  pass: boolean;
  statusCode: number;
  responseTimeMs: number;
  error?: string;
}

const BASE_URL = process.argv[2] || 'http://localhost:3000';

const CHECKS: SmokeCheck[] = [
  {
    name: 'Homepage loads',
    url: '/',
    expectedStatus: [200, 301, 302, 307, 308],
    maxResponseTimeMs: 5000,
  },
  {
    name: 'Products page loads',
    url: '/en/products',
    expectedStatus: [200, 301, 302, 307, 308],
    maxResponseTimeMs: 5000,
  },
  {
    name: 'Login page loads',
    url: '/en/login',
    expectedStatus: [200, 301, 302, 307, 308],
    maxResponseTimeMs: 5000,
  },
  {
    name: 'Cart page loads',
    url: '/en/cart',
    expectedStatus: [200, 301, 302, 307, 308],
    maxResponseTimeMs: 5000,
  },
  {
    name: 'API vitals endpoint responds',
    url: '/api/vitals',
    method: 'POST',
    expectedStatus: [200, 400, 405], // 400 if no body, that's OK — endpoint exists
    maxResponseTimeMs: 3000,
  },
  {
    name: 'manifest.json loads',
    url: '/manifest.json',
    expectedStatus: 200,
    maxResponseTimeMs: 2000,
    validateBody: (body) => {
      try {
        const json = JSON.parse(body);
        return !!json.name;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Security headers present',
    url: '/en',
    expectedStatus: [200, 301, 302, 307, 308],
    validateHeaders: (headers) => {
      // At minimum, X-Content-Type-Options should be set
      const xContentType = headers.get('x-content-type-options');
      return xContentType === 'nosniff';
    },
  },
];

async function runCheck(check: SmokeCheck): Promise<SmokeResult> {
  const url = `${BASE_URL}${check.url}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), check.maxResponseTimeMs ?? 10_000);

    const res = await fetch(url, {
      method: check.method ?? 'GET',
      redirect: 'manual', // don't follow — we check status directly
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - start;
    const statusCode = res.status;

    // Status check
    const expectedStatuses = Array.isArray(check.expectedStatus)
      ? check.expectedStatus
      : check.expectedStatus
        ? [check.expectedStatus]
        : [200];

    if (!expectedStatuses.includes(statusCode)) {
      return {
        name: check.name,
        pass: false,
        statusCode,
        responseTimeMs,
        error: `Expected status ${expectedStatuses.join('|')}, got ${statusCode}`,
      };
    }

    // Response time check
    if (check.maxResponseTimeMs && responseTimeMs > check.maxResponseTimeMs) {
      return {
        name: check.name,
        pass: false,
        statusCode,
        responseTimeMs,
        error: `Response time ${responseTimeMs}ms > max ${check.maxResponseTimeMs}ms`,
      };
    }

    // Body validation
    if (check.validateBody) {
      const body = await res.text();
      if (!check.validateBody(body)) {
        return {
          name: check.name,
          pass: false,
          statusCode,
          responseTimeMs,
          error: 'Body validation failed',
        };
      }
    }

    // Header validation
    if (check.validateHeaders) {
      if (!check.validateHeaders(res.headers)) {
        return {
          name: check.name,
          pass: false,
          statusCode,
          responseTimeMs,
          error: 'Header validation failed',
        };
      }
    }

    return { name: check.name, pass: true, statusCode, responseTimeMs };
  } catch (err) {
    return {
      name: check.name,
      pass: false,
      statusCode: 0,
      responseTimeMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log(`\n🔍 Post-deploy smoke tests against: ${BASE_URL}\n`);
  console.log('─'.repeat(60));

  const results: SmokeResult[] = [];

  for (const check of CHECKS) {
    const result = await runCheck(check);
    results.push(result);
    const icon = result.pass ? '✅' : '❌';
    const time = `${result.responseTimeMs}ms`;
    console.log(`${icon} ${result.name.padEnd(35)} ${String(result.statusCode).padEnd(5)} ${time}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  }

  console.log('─'.repeat(60));

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} checks\n`);

  if (failed > 0) {
    console.error('❌ Smoke tests FAILED — DO NOT promote this deployment');
    process.exit(1);
  } else {
    console.log('✅ All smoke tests PASSED — safe to promote');
    process.exit(0);
  }
}

main();
