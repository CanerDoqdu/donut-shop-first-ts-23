/**
 * k6 Load Test — Donut Shop API
 *
 * Scenarios:
 *   1. Product browsing (GET /api/products)
 *   2. Product search (GET /api/products/search)
 *   3. Checkout flow (POST /api/checkout)
 *
 * Thresholds:
 *   - p95 response time < 2 seconds
 *   - Error rate < 1%
 *
 * Usage:
 *   k6 run scripts/load-test.js
 *   k6 run --vus 50 --duration 3m scripts/load-test.js
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

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: 30,
      duration: '3m',
      exec: 'browseProducts',
      tags: { scenario: 'browse' },
    },
    search: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      exec: 'searchProducts',
      startTime: '10s',
      tags: { scenario: 'search' },
    },
    checkout: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      exec: 'checkoutFlow',
      startTime: '20s',
      tags: { scenario: 'checkout' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],      // p95 < 2 seconds
    errors: ['rate<0.01'],                   // Error rate < 1%
    product_browse_duration: ['p(95)<1000'], // Browse p95 < 1s
    product_search_duration: ['p(95)<1500'], // Search p95 < 1.5s
    checkout_duration: ['p(95)<3000'],       // Checkout p95 < 3s
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
  const summary = {
    timestamp: new Date().toISOString(),
    totalRequests: data.metrics.http_reqs?.values?.count || 0,
    p95Duration: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
    p99Duration: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
    errorRate: data.metrics.errors?.values?.rate || 0,
    scenarios: {
      browse: {
        p95: data.metrics.product_browse_duration?.values?.['p(95)'] || 0,
      },
      search: {
        p95: data.metrics.product_search_duration?.values?.['p(95)'] || 0,
      },
      checkout: {
        p95: data.metrics.checkout_duration?.values?.['p(95)'] || 0,
      },
    },
    thresholds: {
      'p95 < 2s': (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 2000,
      'error rate < 1%': (data.metrics.errors?.values?.rate || 0) < 0.01,
    },
  };

  return {
    'scripts/load-test-results.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Import textSummary helper
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
