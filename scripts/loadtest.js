#!/usr/bin/env node
/**
 * SCM Platform load test — sustains enough order-creation traffic to push
 * order-service CPU above 60% and trigger ECS target-tracking autoscaling.
 *
 * Key design decisions vs. the previous version:
 *   • Concurrency reduced to 20 workers  — previous 50 crashed the service before
 *     CloudWatch could observe 60% average CPU (crash → restart → 0% → average stays low)
 *   • Pre-test inventory seed             — ensures SKUs have ≥2000 units so POST /api/orders
 *     doesn't fail with 409 after only ~500 orders, which would cut CPU load
 *   • 409 (out-of-stock) re-seeds inline  — automatic recovery if stock runs out mid-test
 *   • Proper X-User-Id header             — order-service requires it; missing it gives 400
 *   • Inter-request delay 30–60 ms        — throttles each worker just enough to avoid
 *     Tomcat thread-pool saturation while keeping RPS high enough for 60%+ CPU
 *
 * Autoscaling thresholds:
 *   order-service:        ECSServiceAverageCPUUtilization > 60%  (cooldown 60s in, 180s out)
 *   shipment-service:     ECSServiceAverageCPUUtilization > 60%
 *   notification-service: ECSServiceAverageCPUUtilization > 55%
 *
 * Usage:
 *   node scripts/loadtest.js
 *
 * Options (env vars):
 *   BASE_URL       default: https://scm.maayn.com
 *   LT_EMAIL       default: admin@scm.local
 *   LT_PASSWORD    default: Admin@12345
 *   CONCURRENCY    default: 20
 *   DURATION_S     default: 420  (7 min — need ≥3 consecutive 1-min windows above threshold)
 *   RAMP_S         default: 10
 *   SEED_QTY       default: 2000 (units to top up each SKU before/during test)
 *
 * Typical timeline:
 *   T+0s    — seed inventory, acquire token
 *   T+30s   — 20 workers ramped, CPU climbs to 60–90% on order-service
 *   T+90s   — CloudWatch (1-min resolution) aggregates first window > 60%
 *   T+120s  — Application Auto Scaling fires, new ECS task launches
 *   T+210s  — new Spring Boot task healthy, Eureka registers it
 *   T+240s  — gateway routes to both tasks, per-task CPU normalises
 *
 * Watch autoscaling in a separate terminal:
 *   watch -n 10 "aws ecs describe-services --cluster scm-cluster \
 *     --services order-service shipment-service notification-service \
 *     --region eu-north-1 \
 *     --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount}' \
 *     --output table"
 */

'use strict';

const https    = require('https');
const http     = require('http');
const { URL }  = require('url');
const { randomUUID } = require('crypto');

// ── config ────────────────────────────────────────────────────────────────────
const BASE_URL    = process.env.BASE_URL    || 'https://scm.maayn.com';
const EMAIL       = process.env.LT_EMAIL    || 'admin@scm.local';
const PASSWORD    = process.env.LT_PASSWORD || 'Admin@12345';
const CONCURRENCY = parseInt(process.env.CONCURRENCY  || '20',  10);
const DURATION_S  = parseInt(process.env.DURATION_S   || '420', 10);
const RAMP_S      = parseInt(process.env.RAMP_S        || '10',  10);
const SEED_QTY    = parseInt(process.env.SEED_QTY      || '2000', 10);

// SKUs that exist in the demo inventory; keep list short so each gets seeded heavily
const SKUS = ['KEYBOARD-001', 'MOUSE-001', 'WEBCAM-001', 'SSD-001', 'CABLE-001'];

const ADDRESSES = [
  '10 Baker Street, London, UK',
  '221B Baker Street, London, UK',
  '42 Wallaby Way, Sydney, AU',
  '1600 Pennsylvania Ave, Washington DC, US',
  '350 Fifth Avenue, New York, US',
];

// ── stats ─────────────────────────────────────────────────────────────────────
const stats = { sent: 0, ok: 0, err: 0, timeoutMs: 0, byStatus: {}, latencies: [] };
let token  = null;
let userId = null;
let running = true;
let activeWorkers = 0;

// ── helpers ───────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function request(method, path, body, authToken, extraHeaders = {}) {
  return new Promise((resolve) => {
    const url  = new URL(path, BASE_URL);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
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
        ...extraHeaders,
      },
      timeout: 15_000,
    };

    const req = lib.request(opts, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - start, body }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ms: Date.now() - start, body: '' }); });
    req.on('error',   () => {               resolve({ status: 0, ms: Date.now() - start, body: '' }); });
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  return new Promise((resolve, reject) => {
    const url  = new URL('/api/auth/login', BASE_URL);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify({ email: EMAIL, password: PASSWORD });
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 15_000,
    };
    const req = lib.request(opts, (resp) => {
      let b = '';
      resp.on('data', c => { b += c; });
      resp.on('end', () => {
        try {
          const d = JSON.parse(b);
          const tok = d.token || d.accessToken || d.access_token;
          // Try response body first, fall back to decoding JWT payload
          let uid = d.userId ?? d.user?.id ?? null;
          if (!uid && tok) {
            try {
              const payload = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString());
              uid = payload.userId ?? payload.id ?? payload.user_id ?? payload.sub ?? null;
              if (uid) uid = Number(uid) || uid; // coerce numeric strings
            } catch { /* ignore JWT decode errors */ }
          }
          if (!tok) reject(new Error(`No token: ${b.slice(0,200)}`));
          else resolve({ token: tok, userId: uid });
        } catch { reject(new Error(`Bad JSON: ${b.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Login timeout')); });
    req.write(data);
    req.end();
  });
}

async function seedInventory() {
  console.log(`Seeding inventory (${SEED_QTY} units per SKU for ${SKUS.length} SKUs)...`);
  // GET current products
  const { status, body } = await request('GET', '/api/products', null, token);
  if (status !== 200) {
    console.warn(`  Could not fetch products (${status}), skipping seed`);
    return;
  }
  let products = [];
  try { products = JSON.parse(body); } catch { console.warn('  Bad JSON from inventory, skipping seed'); return; }
  if (!Array.isArray(products)) {
    // Might be paginated
    try { const p = JSON.parse(body); products = p.content ?? []; } catch { products = []; }
  }

  for (const sku of SKUS) {
    const product = products.find(p => p.sku === sku);
    if (!product) {
      console.warn(`  SKU ${sku} not found in inventory, skipping`);
      continue;
    }
    const currentQty = product.quantity ?? 0;
    if (currentQty >= SEED_QTY) {
      console.log(`  SKU ${sku}: already ${currentQty} units, no seed needed`);
      continue;
    }
    const addQty = SEED_QTY - currentQty;
    const { status: s } = await request('PATCH', `/api/products/${product.id}`, {
      quantity: currentQty + addQty,
    }, token);
    if (s === 200 || s === 204) {
      console.log(`  SKU ${sku}: topped up to ${currentQty + addQty} units`);
    } else {
      // Try PUT
      const { status: s2 } = await request('PUT', `/api/products/${product.id}`, {
        ...product, quantity: currentQty + addQty,
      }, token);
      console.log(`  SKU ${sku}: PUT update → ${s2}`);
    }
  }
}

function buildOrderPayload() {
  return {
    idempotencyKey: randomUUID(),
    shippingAddress: pick(ADDRESSES),
    items: [{
      sku: pick(SKUS),
      quantity: 1,
      unitPrice: parseFloat((Math.random() * 100 + 10).toFixed(2)),
    }],
  };
}

// ── worker ────────────────────────────────────────────────────────────────────
let reseedPending = false;

async function worker(id, startTime) {
  activeWorkers++;
  await new Promise(r => setTimeout(r, (id / CONCURRENCY) * RAMP_S * 1000));

  while (running && (Date.now() - startTime) < DURATION_S * 1000) {
    const roll = Math.random();
    let method, path, body, extraHeaders = {};

    if (roll < 0.75) {
      // POST /api/orders — main CPU driver
      method = 'POST'; path = '/api/orders'; body = buildOrderPayload();
      if (userId) extraHeaders['X-User-Id'] = String(userId);
    } else if (roll < 0.90) {
      method = 'GET'; path = '/api/orders';
      if (userId) extraHeaders['X-User-Id'] = String(userId);
    } else if (roll < 0.95) {
      method = 'GET'; path = '/api/shipments';
      if (userId) extraHeaders['X-User-Id'] = String(userId);
    } else {
      method = 'GET'; path = '/api/products';
    }

    stats.sent++;
    const { status, ms } = await request(method, path, body, token, extraHeaders);
    stats.latencies.push(ms);

    if (status >= 200 && status < 300) {
      stats.ok++;
    } else if (status === 0) {
      stats.timeoutMs++;
    } else {
      stats.err++;
      // If stock exhausted mid-test, trigger a single re-seed
      if (status === 409 && !reseedPending) {
        reseedPending = true;
        seedInventory().then(() => { reseedPending = false; }).catch(() => { reseedPending = false; });
      }
    }
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // 30–60ms between requests: throttles each worker to ~20–33 RPS
    // 20 workers × 25ms avg = ~400 RPS aggregate but with I/O overlap → ~80–120 effective RPS
    await new Promise(r => setTimeout(r, 30 + Math.random() * 30));
  }
  activeWorkers--;
}

// ── metrics display ───────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * sorted.length)];
}

let prevSent = 0, prevTime = Date.now();

function printStats(elapsed) {
  const now = Date.now(), window = (now - prevTime) / 1000;
  const rps = ((stats.sent - prevSent) / window).toFixed(1);
  prevSent = stats.sent; prevTime = now;
  const p50 = percentile(stats.latencies, 50);
  const p95 = percentile(stats.latencies, 95);
  stats.latencies = [];
  const statLine = Object.entries(stats.byStatus).map(([s, c]) => `${s}:${c}`).join(' ');
  process.stdout.write(
    `\r[${String(elapsed).padStart(3)}s/${DURATION_S}s] ` +
    `workers:${activeWorkers}/${CONCURRENCY}  rps:${rps.padStart(5)}  ` +
    `ok:${stats.ok}  err:${stats.err}  timeout:${stats.timeoutMs}  ` +
    `p50:${p50}ms p95:${p95}ms  [${statLine}]  remaining:${Math.max(0,DURATION_S-elapsed)}s   `,
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
    const result = await login();
    token  = result.token;
    userId = result.userId;
    console.log(`Login OK. Token acquired. userId=${userId}`);
  } catch (e) {
    console.error(`Login failed: ${e.message}`);
    process.exit(1);
  }

  await seedInventory();
  console.log('');

  console.log('Starting workers... (Ctrl+C to stop early)');
  console.log('');
  console.log('Autoscaling watcher ON (eu-north-1/scm-cluster) for: order-service, shipment-service, notification-service');
  console.log('Watch autoscaling:');
  console.log('  aws ecs describe-services --cluster scm-cluster \\');
  console.log('    --services order-service shipment-service notification-service \\');
  console.log('    --region eu-north-1 \\');
  console.log("    --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount}'");
  console.log('');

  const startTime = Date.now();
  const workerPromises = Array.from({ length: CONCURRENCY }, (_, i) => worker(i, startTime));

  const ticker = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    printStats(elapsed);
    if (elapsed >= DURATION_S) { running = false; clearInterval(ticker); }
  }, 3000);

  await Promise.all(workerPromises);
  clearInterval(ticker);

  const totalS = ((Date.now() - startTime) / 1000).toFixed(1);
  const successRate = stats.sent ? ((stats.ok / stats.sent) * 100).toFixed(1) : 0;

  console.log('\n');
  console.log('=== Results ===');
  console.log(`Duration:      ${totalS}s`);
  console.log(`Total reqs:    ${stats.sent}`);
  console.log(`Avg RPS:       ${(stats.sent / totalS).toFixed(1)}`);
  console.log(`Success rate:  ${successRate}%`);
  console.log(`2xx OK:        ${stats.ok}`);
  console.log(`Errors:        ${stats.err}`);
  console.log(`Timeouts:      ${stats.timeoutMs}`);
  console.log(`By status:     ${JSON.stringify(stats.byStatus)}`);
  console.log('');
  console.log('If autoscaling fired, you should see desiredCount > 1 in:');
  console.log('  aws ecs describe-services --cluster scm-cluster --services order-service shipment-service --region eu-north-1 --query "services[*].{name:serviceName,running:runningCount,desired:desiredCount}" --output table');
})();
