#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const BASE_URL = process.env.LH_BASE_URL || 'http://127.0.0.1:3000';
const OUTPUT_DIR = '.lighthouseci';
const REPORT_FILE = join(OUTPUT_DIR, 'route-scores.json');
const MIN_SCORE = Number(process.env.LH_MIN_SCORE || '0.95');
const DISABLE_MONITORING = process.env.LH_DISABLE_MONITORING || '1';

const DEFAULT_ROUTES = [
  '/tr',
  '/tr/products',
  '/tr/stores',
  '/tr/gift-cards',
  '/tr/loyalty',
  '/tr/subscriptions',
  '/tr/referrals',
  '/tr/login',
  '/tr/register',
  '/en',
  '/en/products',
  '/en/stores',
  '/en/gift-cards',
  '/en/loyalty',
  '/en/subscriptions',
  '/en/referrals',
  '/en/login',
  '/en/register',
];

const ROUTES = (process.env.LH_ROUTES || DEFAULT_ROUTES.join(','))
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: options.stdio || 'pipe',
      env: options.env || process.env,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const text = String(chunk);
        stdout += text;
        if (options.stream) process.stdout.write(text);
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        const text = String(chunk);
        stderr += text;
        if (options.stream) process.stderr.write(text);
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr || stdout}`));
      }
    });

    child.on('error', reject);
  });
}

async function waitForServer(url, maxWaitMs = 60_000) {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server did not become ready within ${maxWaitMs}ms: ${url}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function runLighthouseForRoute(route) {
  const safeRoute = route.replace(/\//g, '_').replace(/^_/, '');
  const outputPath = join(OUTPUT_DIR, `${safeRoute || 'root'}.json`);
  const url = `${BASE_URL}${route}`;

  await run(
    'npx',
    [
      '--yes',
      'lighthouse',
      url,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--preset=desktop',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      `--output-path=${outputPath}`,
    ],
    { stream: false },
  );

  const raw = await readFile(outputPath, 'utf8');
  const report = JSON.parse(raw);

  const scores = Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      Number(report.categories?.[category]?.score ?? 0),
    ]),
  );

  return {
    route,
    url,
    scores,
  };
}

function asPercent(score) {
  return `${Math.round(score * 100)}`.padStart(3, ' ');
}

function printSummary(results) {
  console.log('');
  console.log(`Lighthouse minimum score target: ${Math.round(MIN_SCORE * 100)}+`);
  console.log('');
  console.log('Route                                perf  a11y  best  seo');
  console.log('-------------------------------------------------------------');

  for (const result of results) {
    const row = `${result.route.padEnd(36)} ${asPercent(result.scores.performance)}   ${asPercent(result.scores.accessibility)}   ${asPercent(result.scores['best-practices'])}   ${asPercent(result.scores.seo)}`;
    console.log(row);
  }

  console.log('');
}

async function main() {
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const readinessUrl = `${BASE_URL}/tr`;
  const alreadyRunning = await isServerReady(readinessUrl);

  let server = null;
  if (!alreadyRunning) {
    server = spawn('npm', ['run', 'start'], {
      shell: process.platform === 'win32',
      stdio: 'pipe',
      env: {
        ...process.env,
        NEXT_PUBLIC_DISABLE_MONITORING: DISABLE_MONITORING,
      },
    });

    server.stdout?.on('data', (chunk) => process.stdout.write(String(chunk)));
    server.stderr?.on('data', (chunk) => process.stderr.write(String(chunk)));
  }

  try {
    await waitForServer(readinessUrl);

    const results = [];
    for (const route of ROUTES) {
      console.log(`Running Lighthouse: ${route}`);
      const result = await runLighthouseForRoute(route);
      results.push(result);
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(REPORT_FILE, JSON.stringify({ minScore: MIN_SCORE, results }, null, 2), 'utf8');

    printSummary(results);

    const failed = results.flatMap((result) =>
      CATEGORIES.filter((category) => result.scores[category] < MIN_SCORE).map(
        (category) => ({ route: result.route, category, score: result.scores[category] }),
      ),
    );

    if (failed.length > 0) {
      console.error('Failed route/category scores:');
      for (const item of failed) {
        console.error(`- ${item.route} :: ${item.category} = ${Math.round(item.score * 100)}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`All routes passed Lighthouse >= ${Math.round(MIN_SCORE * 100)}.`);
  } finally {
    if (server) {
      server.kill('SIGINT');
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
