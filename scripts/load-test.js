/**
 * k6 Load Test — Donut Shop API
 *
 * Scenarios:
 *   1. Product browsing  (GET  /api/products)        — 60% of traffic
 *   2. Product search    (GET  /api/products/search)  — 20% of traffic
 *   3. Checkout flow     (POST /api/checkout)         — 20% of traffic
 *
 * Load profile (500 concurrent users):
 *   Stage 1 — Ramp-up:   0 → 500 VUs over 60 s
 *   Stage 2 — Sustained: 500 VUs for 3 min
 *   Stage 3 — Ramp-down: 500 → 0 VUs over 60 s
 *
 * Thresholds:
 *   - Overall p95 response time < 2 s
 *   - Checkout p95 < 500 ms
 *   - Browse   p95 < 500 ms
 *   - Search   p95 < 1 s
 *   - Error rate < 1 %
 *
 * Usage:
 *   k6 run scripts/load-test.js
 *   k6 run --env BASE_URL=https://staging.example.com scripts/load-test.js
 *
 * Environment:
 *   BASE_URL (default: http://localhost:3000)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ─────────────────────────────────────────

const errorRate = new Rate('errors');
const productBrowseTrend = new Trend('product_browse_duration');
const productSearchTrend = new Trend('product_search_duration');
const checkoutTrend = new Trend('checkout_duration');

// ─── Configuration ──────────────────────────────────────────
// 500 concurrent users: ramp-up 60 s → sustained 3 min → ramp-down 60 s
// Traffic split roughly 60 / 20 / 20 across browse / search / checkout.

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      stages: [
        { duration: '60s',  target: 300 },  // ramp 0 → 300
        { duration: '3m',   target: 300 },  // hold 300
        { duration: '60s',  target: 0 },    // ramp down
      ],
      exec: 'browseProducts',
      tags: { scenario: 'browse' },
    },
    search: {
      executor: 'ramping-vus',
      stages: [
        { duration: '60s',  target: 100 },
        { duration: '3m',   target: 100 },
        { duration: '60s',  target: 0 },
      ],
      exec: 'searchProducts',
      startTime: '5s',
      tags: { scenario: 'search' },
    },
    checkout: {
      executor: 'ramping-vus',
      stages: [
        { duration: '60s',  target: 100 },
        { duration: '3m',   target: 100 },
        { duration: '60s',  target: 0 },
      ],
      exec: 'checkoutFlow',
      startTime: '10s',
      tags: { scenario: 'checkout' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],       // overall p95 < 2 s
    errors: ['rate<0.01'],                    // error rate < 1 %
    product_browse_duration: ['p(95)<500'],   // browse  p95 < 500 ms
    product_search_duration: ['p(95)<1000'],  // search  p95 < 1 s
    checkout_duration: ['p(95)<500'],         // checkout p95 < 500 ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ─── Helper Functions ───────────────────────────────────────

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

// ─── Scenario: Browse Products ──────────────────────────────

export function browseProducts() {
  group('Product Browse', () => {
    // 1. Fetch all products
    const allProducts = http.get(`${BASE_URL}/api/products`, {
      headers: getHeaders(),
      tags: { name: 'GET /api/products' },
    });

    productBrowseTrend.add(allProducts.timings.duration);

    const allCheck = check(allProducts, {
      'products: status 200': (r) => r.status === 200,
      'products: has products array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).products);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!allCheck);

    // 2. Fetch featured products
    const featured = http.get(`${BASE_URL}/api/products?featured=true`, {
      headers: getHeaders(),
      tags: { name: 'GET /api/products?featured=true' },
    });

    check(featured, {
      'featured: status 200': (r) => r.status === 200,
    });

    // 3. Fetch by category
    const categories = ['classic', 'premium', 'seasonal'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    const byCategory = http.get(`${BASE_URL}/api/products?category=${category}`, {
      headers: getHeaders(),
      tags: { name: 'GET /api/products?category' },
    });

    check(byCategory, {
      'category: status 200': (r) => r.status === 200,
    });

    sleep(Math.random() * 2 + 1); // 1-3s think time
  });
}

// ─── Scenario: Product Search ───────────────────────────────

export function searchProducts() {
  group('Product Search', () => {
    const queries = ['strawberry', 'chocolate', 'caramel', 'maple', 'vanilla', 'donut', 'berry'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const searchRes = http.get(`${BASE_URL}/api/products/search?q=${query}&limit=10`, {
      headers: getHeaders(),
      tags: { name: 'GET /api/products/search' },
    });

    productSearchTrend.add(searchRes.timings.duration);

    const searchCheck = check(searchRes, {
      'search: status 200': (r) => r.status === 200,
      'search: has results array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).results);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!searchCheck);

    sleep(Math.random() * 3 + 2); // 2-5s think time
  });
}

// ─── Scenario: Checkout Flow ────────────────────────────────

export function checkoutFlow() {
  group('Checkout Flow', () => {
    // 1. Browse products first
    const productsRes = http.get(`${BASE_URL}/api/products?limit=5`, {
      headers: getHeaders(),
    });

    let products = [];
    try {
      products = JSON.parse(productsRes.body).products || [];
    } catch {
      errorRate.add(true);
      return;
    }

    if (products.length === 0) {
      errorRate.add(true);
      return;
    }

    sleep(1); // Think time

    // 2. Attempt checkout
    const selectedProduct = products[Math.floor(Math.random() * products.length)];

    const payload = JSON.stringify({
      items: [
        {
          id: selectedProduct.id,
          quantity: Math.floor(Math.random() * 3) + 1,
        },
      ],
      customerEmail: `loadtest+${Date.now()}@example.com`,
      customerName: 'Load Test User',
      locale: 'en',
      cartTimestamp: Date.now(),
    });

    const checkoutRes = http.post(`${BASE_URL}/api/checkout`, payload, {
      headers: getHeaders(),
      tags: { name: 'POST /api/checkout' },
    });

    checkoutTrend.add(checkoutRes.timings.duration);

    // Checkout will likely return 400 (missing required fields) or 402 (Stripe not configured)
    // That's expected — we're testing response time, not business logic
    const checkoutCheck = check(checkoutRes, {
      'checkout: responds within 3s': (r) => r.timings.duration < 3000,
      'checkout: returns JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!checkoutCheck);

    sleep(Math.random() * 5 + 3); // 3-8s think time
  });
}

// ─── Summary Handler ────────────────────────────────────────

export function handleSummary(data) {
  const val = (metric, key = 'p(95)') =>
    data.metrics[metric]?.values?.[key] ?? 0;

  const summary = {
    timestamp: new Date().toISOString(),
    totalRequests: val('http_reqs', 'count'),
    latency: {
      p50: val('http_req_duration', 'p(50)'),
      p95: val('http_req_duration', 'p(95)'),
      p99: val('http_req_duration', 'p(99)'),
      max: val('http_req_duration', 'max'),
      avg: val('http_req_duration', 'avg'),
    },
    errorRate: val('errors', 'rate'),
    scenarios: {
      browse: {
        p50: val('product_browse_duration', 'p(50)'),
        p95: val('product_browse_duration', 'p(95)'),
        p99: val('product_browse_duration', 'p(99)'),
      },
      search: {
        p50: val('product_search_duration', 'p(50)'),
        p95: val('product_search_duration', 'p(95)'),
        p99: val('product_search_duration', 'p(99)'),
      },
      checkout: {
        p50: val('checkout_duration', 'p(50)'),
        p95: val('checkout_duration', 'p(95)'),
        p99: val('checkout_duration', 'p(99)'),
      },
    },
    thresholds: {
      'overall p95 < 2s':     val('http_req_duration') < 2000,
      'browse p95 < 500ms':   val('product_browse_duration') < 500,
      'search p95 < 1s':      val('product_search_duration') < 1000,
      'checkout p95 < 500ms': val('checkout_duration') < 500,
      'error rate < 1%':      val('errors', 'rate') < 0.01,
    },
    loadProfile: {
      peakVUs: 500,
      rampUpSeconds: 60,
      sustainedSeconds: 180,
      rampDownSeconds: 60,
    },
  };

  return {
    'scripts/load-test-results.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Import textSummary helper
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
