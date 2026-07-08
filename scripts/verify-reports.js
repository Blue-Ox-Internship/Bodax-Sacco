/**
 * verify-reports.js
 * -----------------
 * Week 3 Reporting Verification Script
 * Compares every dashboard total returned by the API controllers against
 * an independent raw SQL query to catch any mismatch.
 *
 * Usage (from workspace root):
 *   node scripts/verify-reports.js
 *
 * Requires DATABASE_URL (via .env or environment).
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import pg from 'pg';

const currentDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDir, '../.env') });
dotenv.config({ path: resolve(currentDir, '../server/.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const API_BASE = `http://localhost:${process.env.PORT || 4000}`;
const TREASURER_EMAIL    = process.env.TEST_TREASURER_EMAIL    || 'treasurer@bodax.test';
const TREASURER_PASSWORD = process.env.TEST_TREASURER_PASSWORD || 'password123';
const CHAIRMAN_EMAIL     = process.env.TEST_CHAIRMAN_EMAIL     || 'chairman@bodax.test';
const CHAIRMAN_PASSWORD  = process.env.TEST_CHAIRMAN_PASSWORD  || 'password123';
const MEMBER_EMAIL       = process.env.TEST_MEMBER_EMAIL       || 'member@bodax.test';
const MEMBER_PASSWORD    = process.env.TEST_MEMBER_PASSWORD    || 'password123';

function shouldUseSsl(url) {
  if (!url) return false;
  if (url.includes('sslmode=disable')) return false;
  try { return !['localhost','127.0.0.1','::1'].includes(new URL(url).hostname); } catch { return false; }
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : undefined });

let passed = 0;
let failed = 0;

function fmt(v) { const n = Number(v); return isNaN(n) ? String(v) : n.toFixed(2); }

function check(label, expected, actual, tol = 0.01) {
  if (Math.abs(Number(expected) - Number(actual)) <= tol) { console.log(`  ✅  ${label}: ${fmt(actual)}`); passed++; }
  else { console.error(`  ❌  ${label}: API=${fmt(actual)}  DB=${fmt(expected)}  MISMATCH`); failed++; }
}

function checkInt(label, expected, actual) {
  if (Number(expected) === Number(actual)) { console.log(`  ✅  ${label}: ${actual}`); passed++; }
  else { console.error(`  ❌  ${label}: API=${actual}  DB=${expected}  MISMATCH`); failed++; }
}

async function db(sql, params = []) { return (await pool.query(sql, params)).rows; }

async function apiPost(path, body) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const req = http.request(`${API_BASE}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (r) => { let raw = ''; r.on('data', c => raw += c); r.on('end', () => res({ status: r.statusCode, body: JSON.parse(raw), headers: r.headers })); });
    req.on('error', rej); req.write(data); req.end();
  });
}

async function apiGet(path, token) {
  return new Promise((res, rej) => {
    const req = http.request(`${API_BASE}${path}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, (r) => { let raw = ''; r.on('data', c => raw += c); r.on('end', () => res({ status: r.statusCode, body: JSON.parse(raw), headers: r.headers })); });
    req.on('error', rej); req.end();
  });
}

async function login(email, password) {
  const res = await apiPost('/api/auth/login', { identifier: email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

function pad(n) { return n < 10 ? '0' + n : n; }
function weekStart() {
  const d = new Date(); const day = d.getDay() || 7;
  d.setHours(0,0,0,0); d.setDate(d.getDate() - day + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthStart() {
  const d = new Date(); 
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

// ── 1. TREASURER DASHBOARD ──────────────────────────────────────────────────
async function verifyTreasurerDashboard(token) {
  console.log('\n━━━ Treasurer Dashboard ━━━');
  const api = (await apiGet('/api/reports/dashboard/treasurer', token)).body;
  const [r] = await db(`
    SELECT
      (SELECT COUNT(*)::int FROM members WHERE status='active') AS active_members,
      (SELECT COALESCE(SUM(amount),0) FROM savings_transactions WHERE transaction_date=CURRENT_DATE AND confirmed=true) AS daily_collections,
      (SELECT COALESCE(SUM(amount),0) FROM savings_transactions WHERE transaction_date>=$1 AND confirmed=true) AS weekly_collections,
      (SELECT COALESCE(SUM(amount),0) FROM savings_transactions WHERE transaction_date>=$2 AND confirmed=true) AS monthly_collections,
      (SELECT COUNT(*)::int FROM withdrawal_requests WHERE status='pending') AS pending_withdrawals,
      (SELECT COUNT(*)::int FROM loan_requests WHERE status='pending') AS pending_loan_requests,
      (SELECT COUNT(*)::int FROM loans WHERE status='active') AS active_loans
  `, [weekStart(), monthStart()]);
  checkInt('active_members',         r.active_members,         api.active_members);
  check   ('daily_collections',      r.daily_collections,      api.daily_collections);
  check   ('weekly_collections',     r.weekly_collections,     api.weekly_collections);
  check   ('monthly_collections',    r.monthly_collections,    api.monthly_collections);
  checkInt('pending_withdrawals',    r.pending_withdrawals,    api.pending_withdrawals);
  checkInt('pending_loan_requests',  r.pending_loan_requests,  api.pending_loan_requests);
  checkInt('active_loans',           r.active_loans,           api.active_loans);
}

// ── 2. CHAIRMAN DASHBOARD ───────────────────────────────────────────────────
async function verifyChairmanDashboard(token) {
  console.log('\n━━━ Chairman Dashboard ━━━');
  const api = (await apiGet('/api/reports/dashboard/chairman', token)).body;
  const [r] = await db(`
    SELECT
      (SELECT COUNT(*)::int FROM members) AS members,
      (SELECT GREATEST(
         COALESCE((SELECT SUM(amount) FROM savings_transactions WHERE confirmed=true),0)
         -COALESCE((SELECT SUM(amount) FROM withdrawals),0),0)) AS total_savings,
      (SELECT COUNT(*)::int FROM loans WHERE status='active') AS active_loans,
      (SELECT COALESCE(SUM(b),0) FROM (
         SELECT GREATEST(l.total_payable-COALESCE(SUM(r.amount),0),0) AS b
         FROM loans l LEFT JOIN loan_repayments r ON r.loan_id=l.id
         WHERE l.status IN ('active','overdue') GROUP BY l.id) x) AS outstanding_loan_balance,
      (SELECT COALESCE(SUM(b),0) FROM (
         SELECT GREATEST(l.total_payable-COALESCE(SUM(r.amount),0),0) AS b
         FROM loans l LEFT JOIN loan_repayments r ON r.loan_id=l.id
         WHERE l.status='overdue' OR (l.status='active' AND l.due_date<CURRENT_DATE) GROUP BY l.id) x) AS loan_arrears,
      (SELECT COALESCE(SUM(amount),0) FROM savings_transactions WHERE transaction_date>=$1 AND confirmed=true) AS weekly_collections,
      (SELECT COALESCE(SUM(amount),0) FROM savings_transactions WHERE transaction_date>=$2 AND confirmed=true) AS monthly_collections
  `, [weekStart(), monthStart()]);
  checkInt('members',                  r.members,                  api.members);
  check   ('total_savings',            r.total_savings,            api.total_savings);
  checkInt('active_loans',             r.active_loans,             api.active_loans);
  check   ('outstanding_loan_balance', r.outstanding_loan_balance, api.outstanding_loan_balance);
  check   ('loan_arrears',             r.loan_arrears,             api.loan_arrears);
  check   ('weekly_collections',       r.weekly_collections,       api.weekly_collections);
  check   ('monthly_collections',      r.monthly_collections,      api.monthly_collections);
}

// ── 3. ANALYTICS VIEWS ─────────────────────────────────────────────────────
async function verifyAnalytics(token) {
  console.log('\n━━━ Analytics Views ━━━');
  const api = (await apiGet('/api/reports/analytics', token)).body;

  // Top savers
  const tsOk = Array.isArray(api.topSavers) && api.topSavers.length <= 10;
  if (tsOk) { console.log(`  ✅  topSavers: returned ${api.topSavers.length} entries (max 10)`); passed++; }
  else { console.error('  ❌  topSavers: invalid'); failed++; }

  let sorted = true;
  for (let i=1; i<api.topSavers.length; i++) if (+api.topSavers[i].total > +api.topSavers[i-1].total) { sorted=false; break; }
  if (sorted) { console.log('  ✅  topSavers: correctly sorted descending'); passed++; }
  else { console.error('  ❌  topSavers: NOT sorted descending'); failed++; }

  // Cross-check top saver against DB
  if (api.topSavers.length > 0) {
    const topMember = api.topSavers[0].member_number;
    const [dbTop] = await db(`
      SELECT m.member_number,
             GREATEST(COALESCE(SUM(s.amount),0)-COALESCE((SELECT SUM(w.amount) FROM withdrawals w WHERE w.member_id=m.id),0),0) AS total
      FROM members m LEFT JOIN savings_transactions s ON s.member_id=m.id AND s.confirmed=true
      WHERE m.member_number=$1
      GROUP BY m.member_number, m.id
    `, [topMember]);
    if (dbTop) check(`topSavers[0] total (${topMember})`, dbTop.total, api.topSavers[0].total);
  }

  // Defaulters: balance must all be > 0
  const allPositive = api.defaulters.every(d => Number(d.balance) > 0);
  if (allPositive) { console.log(`  ✅  defaulters: all ${api.defaulters.length} have balance > 0`); passed++; }
  else { console.error('  ❌  defaulters: some balance <= 0'); failed++; }

  // Collection trend
  if (Array.isArray(api.trend) && api.trend.length <= 6) { console.log(`  ✅  collectionTrend: ${api.trend.length} month(s)`); passed++; }
  else { console.error('  ❌  collectionTrend: invalid'); failed++; }

  // Income summary numeric
  const iKeys = ['savings_collected','loan_repayments','interest_income'];
  if (iKeys.every(k => !isNaN(Number(api.income[k])))) { console.log('  ✅  incomeSummary: all fields numeric'); passed++; }
  else { console.error('  ❌  incomeSummary: non-numeric'); failed++; }

  // Expenditure numeric
  if (!isNaN(Number(api.expenditure.withdrawals_paid))) { console.log('  ✅  expenditureSummary: numeric'); passed++; }
  else { console.error('  ❌  expenditureSummary: invalid'); failed++; }

  // Cross-check income.savings_collected
  const [dbInc] = await db(`SELECT COALESCE(SUM(amount),0) AS sc FROM savings_transactions WHERE confirmed=true`);
  check('income.savings_collected vs DB', dbInc.sc, api.income.savings_collected);
}

// ── 4. PASSWORD HASHING ─────────────────────────────────────────────────────
async function verifyPasswords() {
  console.log('\n━━━ Password Hashing Check ━━━');
  const rows = await db(`SELECT email, password_hash FROM users`);
  let allHashed = true;
  for (const row of rows) {
    if (!row.password_hash.startsWith('$2')) {
      console.error(`  ❌  ${row.email}: NOT bcrypt-hashed`); allHashed = false; failed++;
    }
  }
  if (allHashed) { console.log(`  ✅  All ${rows.length} users have bcrypt-hashed passwords`); passed++; }
}

// ── 5. HELMET SECURITY HEADERS ─────────────────────────────────────────────
async function verifyHelmetHeaders(token) {
  console.log('\n━━━ HTTP Security Headers (Helmet) ━━━');
  const res = await apiGet('/api/reports/dashboard/treasurer', token);
  const h = res.headers;
  for (const [name, expected] of [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'SAMEORIGIN'],
  ]) {
    if (h[name]?.toLowerCase().includes(expected.toLowerCase())) { console.log(`  ✅  ${name}: ${h[name]}`); passed++; }
    else { console.error(`  ❌  ${name}: missing (got "${h[name]}")`); failed++; }
  }
  if (h['content-security-policy']) { console.log('  ✅  content-security-policy: present'); passed++; }
  else { console.log('  ⚠️   content-security-policy: absent (expected in production)'); }
}

// ── 6. RBAC – MEMBER BLOCKED FROM TREASURER/CHAIRMAN ROUTES ───────────────
async function verifyRBAC(memberToken) {
  console.log('\n━━━ Role-Based Access Control ━━━');
  const routes = [
    '/api/reports/dashboard/treasurer',
    '/api/reports/dashboard/chairman',
    '/api/members',
    '/api/reports/analytics',
    '/api/reports/overdue-loans',
  ];
  for (const route of routes) {
    const res = await apiGet(route, memberToken);
    if (res.status === 403) { console.log(`  ✅  MEMBER blocked from ${route} (403)`); passed++; }
    else { console.error(`  ❌  MEMBER NOT blocked from ${route} – got ${res.status}`); failed++; }
  }
}

// ── 7. RATE LIMITING ────────────────────────────────────────────────────────
async function verifyRateLimiting() {
  console.log('\n━━━ Rate Limiting ━━━');
  let got429 = false;
  for (let i = 0; i < 10; i++) {
    const res = await apiPost('/api/auth/login', { identifier: 'nobody@x.com', password: 'wrong' });
    if (res.status === 429) { got429 = true; break; }
  }
  if (got429) { console.log('  ✅  429 received after repeated login attempts'); passed++; }
  else { console.error('  ❌  No 429 after 10 bad login attempts – check auth rate limit'); failed++; }
}

// ── 8. HEALTH ENDPOINT ──────────────────────────────────────────────────────
async function verifyHealthEndpoint() {
  console.log('\n━━━ Health Endpoint ━━━');
  const res = await new Promise((resolve, reject) => {
    const req = http.request(`${API_BASE}/health`, { method: 'GET' }, (r) => {
      let raw = ''; r.on('data', c => raw += c); r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject); req.end();
  });
  if (res.status === 200 && res.body.status === 'ok') { console.log("  ✅  /health returned 200 { status: 'ok' }"); passed++; }
  else { console.error(`  ❌  /health: ${res.status} ${JSON.stringify(res.body)}`); failed++; }
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  Bodax SACCO – Week 3 Verification Report');
  console.log(`  API: ${API_BASE}`);
  console.log('══════════════════════════════════════════════════════');
  if (!DATABASE_URL) { console.error('ERROR: DATABASE_URL not set.'); process.exit(1); }
  try {
    const [tToken, cToken, mToken] = await Promise.all([
      login(TREASURER_EMAIL, TREASURER_PASSWORD),
      login(CHAIRMAN_EMAIL, CHAIRMAN_PASSWORD),
      login(MEMBER_EMAIL, MEMBER_PASSWORD),
    ]);
    await verifyTreasurerDashboard(tToken);
    await verifyChairmanDashboard(cToken);
    await verifyAnalytics(cToken);
    await verifyPasswords();
    await verifyHelmetHeaders(tToken);
    await verifyRBAC(mToken);
    await verifyRateLimiting();
    await verifyHealthEndpoint();
  } catch (err) {
    console.error('\nFATAL:', err.message);
  } finally {
    await pool.end();
  }
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

main();
