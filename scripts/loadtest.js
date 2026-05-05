#!/usr/bin/env node
/**
 * SCM Platform load test — drives order/shipment/inventory traffic to trigger
 * ECS target-tracking autoscaling (CPU > 60% on order-service/shipment-service,
 * Kafka consumer-lag > 200 on order-service).
 *
 * Usage:
 *   node scripts/loadtest.js [options]
 *
 * Options (env vars):
 *   BASE_URL       default: https://scm.maayn.com
 *   LT_EMAIL       default: admin@scm.local
 *   LT_PASSWORD    default: Admin@12345
 *   CONCURRENCY    default: 20   (parallel workers)
 *   DURATION_S     default: 300  (5 min — long enough for ECS to react)
 *   RAMP_S         default: 30   (ramp-up before full concurrency)
 *
 * What it does:
 *   70% — POST /api/orders  (writes, triggers Kafka, drives CPU + consumer lag)
 *   15% — GET  /api/orders  (read traffic on order-service)
 *   10% — GET  /api/shipments
 *    5% — GET  /api/inventory
 *
 * Watch autoscaling in real time:
 *   aws ecs describe-services --cluster scm-cluster \
 *     --services order-service shipment-service notification-service \
 *     --region eu-north-1 \
 *     --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount}'
 */

'use strict';

const https = require('https');
const http  = require('http');
const { URL } = require('url');
const { randomUUID } = require('crypto');

// ── config ────────────────────────────────────────────────────────────────────
const BASE_URL    = process.env.BASE_URL    || 'https://scm.maayn.com';
const EMAIL       = process.env.LT_EMAIL    || 'admin@scm.local';
const PASSWORD    = process.env.LT_PASSWORD || 'Admin@12345';
const CONCURRENCY = parseInt(process.env.CONCURRENCY  || '20',  10);
const DURATION_S  = parseInt(process.env.DURATION_S   || '300', 10);
const RAMP_S      = parseInt(process.env.RAMP_S        || '30',  10);

// Sample SKUs — adjust to match your inventory data
const SKUS = [
  'SKU-001', 'SKU-002', 'SKU-003', 'SKU-004', 'SKU-005',
  'SKU-010', 'SKU-020', 'SKU-030',
];

const ADDRESSES = [
  '10 Baker Street, London, UK',
  '221B Baker Street, London, UK',
  '42 Wallaby Way, Sydney, AU',
  '1600 Pennsylvania Ave, Washington DC, US',
  '350 Fifth Avenue, New York, US',
];

// ── stats ─────────────────────────────────────────────────────────────────────
const stats = {
  sent: 0, ok: 0, err: 0, timeoutMs: 0,
  byStatus: {},
  latencies: [],
};

let token = null;
let running = true;
let activeWorkers = 0;

// ── helpers ───────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function request(method, path, body, authToken) {
  return new Promise((resolve) => {
    const url   = new URL(path, BASE_URL);
    const lib   = url.protocol === 'https:' ? https : http;
    const data  = body ? JSON.stringify(body) : null;
    const start = Date.now();

    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 10_000,
    };

    const req = lib.request(opts, (res) => {
      res.resume(); // drain
      const ms = Date.now() - start;
      resolve({ status: res.statusCode, ms });
    });

    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ms: Date.now() - start }); });
    req.on('error',   () => {               resolve({ status: 0, ms: Date.now() - start }); });

    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  const res = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, null);
  if (res.status !== 200) throw new Error(`Login failed with status ${res.status}`);

  // We need the body — redo with body capture
  return new Promise((resolve, reject) => {
    const url  = new URL('/api/auth/login', BASE_URL);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify({ email: EMAIL, password: PASSWORD });

    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 10_000,
    };

    const req = lib.request(opts, (resp) => {
      let body = '';
      resp.on('data', (c) => { body += c; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const tok = parsed.token || parsed.accessToken || parsed.access_token;
          if (!tok) reject(new Error(`No token in response: ${body.slice(0, 200)}`));
          else resolve(tok);
        } catch { reject(new Error(`Bad login JSON: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Login timeout')); });
    req.write(data);
    req.end();
  });
}

function buildOrderPayload() {
  const itemCount = Math.ceil(Math.random() * 3);
  const items = Array.from({ length: itemCount }, () => ({
    sku: pick(SKUS),
    quantity: Math.ceil(Math.random() * 5),
    unitPrice: parseFloat((Math.random() * 200 + 10).toFixed(2)),
  }));
  return {
    idempotencyKey: randomUUID(),
    shippingAddress: pick(ADDRESSES),
    items,
  };
}

// ── worker ────────────────────────────────────────────────────────────────────
async function worker(id, startTime) {
  activeWorkers++;
  // Ramp: stagger worker start over RAMP_S seconds
  await new Promise(r => setTimeout(r, (id / CONCURRENCY) * RAMP_S * 1000));

  while (running && (Date.now() - startTime) < DURATION_S * 1000) {
    const roll = Math.random();
    let method, path, body;

    if (roll < 0.70) {
      method = 'POST'; path = '/api/orders'; body = buildOrderPayload();
    } else if (roll < 0.85) {
      method = 'GET';  path = '/api/orders';
    } else if (roll < 0.95) {
      method = 'GET';  path = '/api/shipments';
    } else {
      method = 'GET';  path = '/api/inventory';
    }

    stats.sent++;
    const { status, ms } = await request(method, path, body, token);
    stats.latencies.push(ms);

    if (status >= 200 && status < 300) {
      stats.ok++;
    } else if (status === 0) {
      stats.timeoutMs++;
    } else {
      stats.err++;
    }

    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // brief pause so we don't saturate the local network stack
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
  }

  activeWorkers--;
}

// ── metrics display ───────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * sorted.length)];
}

let prevSent = 0;
let prevTime = Date.now();

function printStats(elapsed) {
  const now    = Date.now();
  const window = (now - prevTime) / 1000;
  const rps    = ((stats.sent - prevSent) / window).toFixed(1);
  prevSent = stats.sent;
  prevTime = now;

  const p50 = percentile(stats.latencies, 50);
  const p95 = percentile(stats.latencies, 95);
  const p99 = percentile(stats.latencies, 99);
  stats.latencies = []; // rolling window

  const remaining = Math.max(0, DURATION_S - elapsed);
  const statLine = Object.entries(stats.byStatus)
    .map(([s, c]) => `${s}:${c}`)
    .join(' ');

  process.stdout.write(
    `\r[${String(elapsed).padStart(3)}s/${DURATION_S}s] ` +
    `workers:${activeWorkers}/${CONCURRENCY}  ` +
    `rps:${rps.padStart(5)}  ` +
    `ok:${stats.ok}  err:${stats.err}  timeout:${stats.timeoutMs}  ` +
    `p50:${p50}ms p95:${p95}ms p99:${p99}ms  ` +
    `[${statLine}]` +
    `  remaining:${remaining}s   `,
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('SCM Platform Load Test');
  console.log('======================');
  console.log(`Target:       ${BASE_URL}`);
  console.log(`User:         ${EMAIL}`);
  console.log(`Concurrency:  ${CONCURRENCY} workers`);
  console.log(`Duration:     ${DURATION_S}s  (ramp: ${RAMP_S}s)`);
  console.log('');

  console.log('Authenticating...');
  try {
    token = await login();
    console.log('Login OK. Token acquired.');
  } catch (e) {
    console.error(`Login failed: ${e.message}`);
    console.error('Set LT_EMAIL and LT_PASSWORD env vars to match a valid account.');
    process.exit(1);
  }

  console.log('');
  console.log('Starting workers... (Ctrl+C to stop early)');
  console.log('');
  console.log('Watch autoscaling:');
  console.log('  aws ecs describe-services --cluster scm-cluster \\');
  console.log('    --services order-service shipment-service notification-service \\');
  console.log('    --region eu-north-1 \\');
  console.log('    --query \'services[*].{name:serviceName,running:runningCount,desired:desiredCount}\'');
  console.log('');

  const startTime = Date.now();

  // Launch workers
  const workerPromises = Array.from({ length: CONCURRENCY }, (_, i) => worker(i, startTime));

  // Stats ticker
  const ticker = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    printStats(elapsed);
    if (elapsed >= DURATION_S) {
      running = false;
      clearInterval(ticker);
    }
  }, 2000);

  await Promise.all(workerPromises);
  clearInterval(ticker);

  const totalS = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgRps = (stats.sent / totalS).toFixed(1);

  console.log('\n');
  console.log('=== Results ===');
  console.log(`Duration:    ${totalS}s`);
  console.log(`Total reqs:  ${stats.sent}`);
  console.log(`Avg RPS:     ${avgRps}`);
  console.log(`2xx OK:      ${stats.ok}`);
  console.log(`Errors:      ${stats.err}`);
  console.log(`Timeouts:    ${stats.timeoutMs}`);
  console.log(`By status:   ${JSON.stringify(stats.byStatus)}`);
})();
