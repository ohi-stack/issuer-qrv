require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3001);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.1.0';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://issuer.qrv.network';
const REGISTRY_BASE_URL = process.env.REGISTRY_BASE_URL || 'https://registry.qrv.network';
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || 'https://verify.qrv.network';
const ISSUER_API_KEY = process.env.ISSUER_API_KEY || process.env.REGISTRY_API_KEY || '';
const DEFAULT_ISSUER_NAME = process.env.DEFAULT_ISSUER_NAME || 'QRV Demo Issuer';
const DEFAULT_RECORD_PREFIX = process.env.DEFAULT_RECORD_PREFIX || 'QRV-CERT';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);

const issuedRecords = new Map();
const scanCounts = new Map();
const auditEvents = [];

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }));

function now() { return new Date().toISOString(); }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function authHeaders() { return ISSUER_API_KEY ? { authorization: `Bearer ${ISSUER_API_KEY}` } : {}; }
function verifyUrl(qrvid) { return `${VERIFY_BASE_URL}/${encodeURIComponent(qrvid)}`; }
function qrCodeUrl(qrvid) { return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(verifyUrl(qrvid))}`; }
function statusLabel(value) {
  const normalized = String(value || '').toUpperCase();
  if (['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND', 'INVALID_FORMAT', 'UNAVAILABLE'].includes(normalized)) return normalized;
  if (['VALID', 'ACTIVE'].includes(normalized)) return 'VERIFIED';
  if (normalized === 'MISSING') return 'NOT_FOUND';
  return 'UNAVAILABLE';
}
function addAudit(eventType, details = {}) {
  auditEvents.unshift({ eventType, details, timestamp: now() });
  if (auditEvents.length > 50) auditEvents.pop();
}
function rememberRecord(record) {
  if (!record?.qrvid) return record;
  const existing = issuedRecords.get(record.qrvid) || {};
  const normalized = {
    ...existing,
    ...record,
    status: statusLabel(record.status || existing.status || 'VERIFIED'),
    verifyUrl: record.verifyUrl || existing.verifyUrl || verifyUrl(record.qrvid),
    qrCodeUrl: record.qrCodeUrl || existing.qrCodeUrl || qrCodeUrl(record.qrvid),
    createdAt: existing.createdAt || record.timestamp || now(),
    updatedAt: now(),
  };
  issuedRecords.set(record.qrvid, normalized);
  return normalized;
}
function getRecords() {
  return Array.from(issuedRecords.values()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
function recordCard(record) {
  return `<article class="record-card"><div><p class="eyebrow">${escapeHtml(record.recordType || record.type || 'certificate')}</p><h3>${escapeHtml(record.title || record.payload?.title || record.qrvid)}</h3><p class="mono">${escapeHtml(record.qrvid)}</p><p>${escapeHtml(record.issuer || DEFAULT_ISSUER_NAME)} · ${escapeHtml(record.owner || record.subject || 'Issued subject')}</p></div><div><span class="pill ${escapeHtml(statusLabel(record.status).toLowerCase())}">${escapeHtml(statusLabel(record.status))}</span><p class="small">Scans: ${Number(scanCounts.get(record.qrvid) || record.scans || 0)}</p><p><a class="btn small-btn" href="${escapeHtml(record.verifyUrl || verifyUrl(record.qrvid))}">Verify</a> <a class="btn alt small-btn" href="/revoke?qrvid=${encodeURIComponent(record.qrvid)}">Revoke</a></p></div></article>`;
}
function pageHeader(title, subtitle) {
  return `<section class="hero"><div class="eyebrow">Issuer Portal</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><p><a class="btn" href="/records/new">Create Record</a> <a class="btn alt" href="/records">View Records</a></p></section>`;
}
function navLink(path, label) { return `<a href="${path}">${label}</a>`; }

function layout(body, title = 'QR-V Issuer Portal') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>:root{--bg:#061126;--panel:#101f42;--line:#2d477a;--gold:#f2d06b;--cyan:#62cbff;--text:#eef4ff;--muted:#b7c6e6;--green:#22c55e;--red:#ef4444;--orange:#f59e0b}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top,#14366f,#061126 52%,#030711);color:var(--text)}.wrap{max-width:1180px;margin:0 auto;padding:30px 20px}.nav{display:flex;justify-content:space-between;gap:16px;align-items:center}.brand{font-weight:900;letter-spacing:.08em}.nav a{color:#dbeafe;text-decoration:none;margin-left:14px}.hero,.card{background:rgba(16,31,66,.9);border:1px solid var(--line);border-radius:24px;padding:26px;margin-top:24px}.record-card{display:flex;justify-content:space-between;gap:20px;align-items:center;background:rgba(8,23,53,.75);border:1px solid var(--line);border-radius:18px;padding:18px;margin:14px 0}h1{font-size:clamp(38px,7vw,72px);line-height:1;margin:10px 0}p,li{color:var(--muted);font-size:17px;line-height:1.6}.small{font-size:14px}.eyebrow{color:var(--gold);font-size:13px;text-transform:uppercase;letter-spacing:.14em;font-weight:900}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.two{grid-template-columns:repeat(2,1fr)}.btn,button{display:inline-block;border:0;border-radius:999px;background:var(--gold);color:#071126;font-weight:900;padding:13px 18px;text-decoration:none;cursor:pointer}.small-btn{padding:9px 13px;font-size:14px}.btn.alt{background:transparent;border:1px solid var(--line);color:#fff}input,select,textarea{width:100%;padding:14px;border-radius:14px;border:1px solid #3a5288;background:#081735;color:#fff;font-size:16px}label{display:block;margin:12px 0 6px;font-weight:800}.mono{font-family:ui-monospace,Menlo,monospace;color:#dbeafe;word-break:break-word}.success{border-left:4px solid var(--green)}.error{border-left:4px solid var(--red)}.pill{display:inline-block;border-radius:999px;padding:8px 12px;font-weight:900;font-size:12px;background:#1f3b6d;color:#dbeafe}.pill.verified{background:rgba(34,197,94,.18);color:#86efac}.pill.revoked,.pill.expired{background:rgba(245,158,11,.18);color:#fcd34d}.pill.unavailable{background:rgba(239,68,68,.18);color:#fecaca}.stat{font-size:34px;color:#fff;font-weight:900;margin:0}.qr{background:#fff;border-radius:16px;padding:12px;max-width:264px}.footer{margin:30px 0;color:var(--muted)}@media(max-width:800px){.grid,.two{grid-template-columns:1fr}.nav,.record-card{align-items:flex-start;flex-direction:column}.nav a{margin:0 10px 0 0}}</style></head><body><div class="wrap"><nav class="nav"><div class="brand">QR-V™ ISSUER</div><div>${navLink('/dashboard','Dashboard')}${navLink('/records','Records')}${navLink('/issue','Issue')}${navLink('/revoke','Revoke')}${navLink('/api-keys','API Keys')}${navLink('/billing','Billing')}${navLink('/settings','Settings')}</div></nav>${body}<p class="footer">Registry: <span class="mono">${escapeHtml(REGISTRY_BASE_URL)}</span> · Verify: <span class="mono">${escapeHtml(VERIFY_BASE_URL)}</span></p></div></body></html>`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed: ${response.status}`);
  return body;
}
async function createRegistryRecord({ type, issuer, owner, title, expiresAt, payload }) {
  const localQrvid = `${DEFAULT_RECORD_PREFIX}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const body = { type, recordType: type, issuer, owner, title, expiresAt, payload: { title, ...payload } };
  const result = await requestJson(`${REGISTRY_BASE_URL}/registry/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  const qrvid = result.qrvid || result.id || localQrvid;
  return rememberRecord({ ...result, qrvid, issuer, owner, title, recordType: type, type, expiresAt, payload: body.payload, status: result.status || 'VERIFIED' });
}
async function revokeRegistryRecord(qrvid, reason) {
  const result = await requestJson(`${REGISTRY_BASE_URL}/registry/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason })
  });
  const record = rememberRecord({ ...(issuedRecords.get(qrvid) || {}), ...result, qrvid, status: 'REVOKED', revokedAt: now(), revokeReason: reason });
  addAudit('record.revoked', { qrvid, reason });
  return record;
}
async function fetchRegistryRecord(qrvid) {
  const result = await requestJson(`${REGISTRY_BASE_URL}/registry/${encodeURIComponent(qrvid)}`, { headers: { accept: 'application/json' } });
  return rememberRecord({ ...result, qrvid: result.qrvid || qrvid });
}
async function registryReady() {
  const response = await fetch(`${REGISTRY_BASE_URL}/ready`, { headers: { accept: 'application/json' } });
  const registry = await response.json().catch(() => ({}));
  return { ok: response.ok, registry };
}

app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'issuer-qrv', version: VERSION, timestamp: now() }));
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/version', (_req, res) => res.json({ service: 'issuer-qrv', version: VERSION, appBaseUrl: APP_BASE_URL, registryBaseUrl: REGISTRY_BASE_URL, verifyBaseUrl: VERIFY_BASE_URL }));
app.get(['/ready', '/readyz'], async (_req, res) => {
  try {
    const { ok, registry } = await registryReady();
    res.status(ok ? 200 : 503).json({ ready: ok, registry, writeAuthConfigured: Boolean(ISSUER_API_KEY), service: 'issuer-qrv' });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message, writeAuthConfigured: Boolean(ISSUER_API_KEY), service: 'issuer-qrv' });
  }
});

app.get('/', (_req, res) => res.redirect('/dashboard'));
app.get('/login', (_req, res) => {
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Secure issuer access</div><h1>Sign in to issue QR-V records.</h1><p>This production MVP expects authentication at the edge or Hostinger environment. Use this portal only for authorized issuers.</p><form method="get" action="/dashboard"><label>Issuer email</label><input name="email" type="email" placeholder="ops@example.com" required><label>Issuer access token</label><input name="token" type="password" placeholder="Configured outside this demo UI"><p><button type="submit">Continue to Dashboard</button></p></form></section>`, 'Issuer Login'));
});
app.get('/dashboard', async (_req, res) => {
  let ready = false;
  try { ready = (await registryReady()).ok; } catch { ready = false; }
  const records = getRecords();
  const scans = Array.from(scanCounts.values()).reduce((sum, count) => sum + Number(count || 0), 0);
  res.type('html').send(layout(`${pageHeader('Issuer control plane', 'Create records, generate QRVIDs, revoke credentials, and track verification scans from one production portal.')}<section class="grid"><div class="card"><p class="eyebrow">Records</p><p class="stat">${records.length}</p><p>Issued in this portal runtime.</p></div><div class="card"><p class="eyebrow">Verification scans</p><p class="stat">${scans}</p><p>Tracked through issuer analytics endpoint.</p></div><div class="card"><p class="eyebrow">Registry readiness</p><p class="stat">${ready ? 'LIVE' : 'DOWN'}</p><p>${ready ? 'Registry can accept issuer writes.' : 'Registry readiness check is currently unavailable.'}</p></div></section><section class="card"><h2>Recent issuer activity</h2>${auditEvents.length ? `<ul>${auditEvents.slice(0, 8).map((event) => `<li><span class="mono">${escapeHtml(event.timestamp)}</span> ${escapeHtml(event.eventType)} ${escapeHtml(JSON.stringify(event.details))}</li>`).join('')}</ul>` : '<p>No audit events in this runtime yet.</p>'}</section>`, 'Issuer Dashboard'));
});
app.get('/records', (_req, res) => {
  const records = getRecords();
  res.type('html').send(layout(`${pageHeader('Issued records', 'Review QRVIDs created through the issuer portal and open their public verification pages.')}<section class="card"><h2>Records</h2>${records.length ? records.map(recordCard).join('') : '<p>No records have been issued in this runtime yet. Create the first one from /records/new.</p>'}</section>`, 'Issued Records'));
});
app.get(['/records/new', '/certificates', '/issue'], (_req, res) => {
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Create record</div><h1>Issue a registry-backed QRVID.</h1><form method="post" action="/issue"><label>Issuer</label><input name="issuer" value="${escapeHtml(DEFAULT_ISSUER_NAME)}" required><label>Recipient / Subject</label><input name="owner" placeholder="Jane Smith" required><label>Certificate or Record Title</label><input name="title" placeholder="Advanced Verification Certificate" required><label>Record Type</label><select name="type"><option value="certificate">Certificate</option><option value="membership-id">Membership ID</option><option value="product-authentication">Product Authentication</option><option value="document-verification">Document Verification</option><option value="asset-record">Asset Record</option></select><label>Expiration Date (optional)</label><input name="expiresAt" type="date"><label>Metadata</label><textarea name="metadata" rows="4" placeholder="Course, credential, SKU, document reference, or notes"></textarea><p><button type="submit">Create Verifiable Record</button></p></form></section>`, 'Create QR-V Record'));
});
app.post('/issue', async (req, res) => {
  try {
    const { issuer, owner, title, type, metadata, expiresAt } = req.body;
    const result = await createRegistryRecord({ type: type || 'certificate', issuer, owner, title, expiresAt: expiresAt || null, payload: { metadata, source: 'issuer-qrv', issuedAt: now() } });
    addAudit('record.created', { qrvid: result.qrvid, type: result.recordType || result.type });
    res.type('html').send(layout(`<section class="card success"><h1>Record Issued</h1><p>Certificate record created successfully.</p><div class="grid two"><div><p><strong>QRVID</strong></p><p class="mono">${escapeHtml(result.qrvid)}</p><p><strong>Verification URL</strong></p><p class="mono">${escapeHtml(result.verifyUrl)}</p><p><strong>Hash</strong></p><p class="mono">${escapeHtml(result.hash || 'Registry hash pending')}</p><p><a class="btn" href="${escapeHtml(result.verifyUrl)}">Open Verification Page</a> <a class="btn alt" href="/records/new">Issue Another</a></p></div><div><img class="qr" alt="QR code for ${escapeHtml(result.qrvid)}" src="${escapeHtml(result.qrCodeUrl)}"></div></div></section>`,'Record Issued'));
  } catch (error) {
    res.status(502).type('html').send(layout(`<section class="card error"><h1>Issue Failed</h1><p>${escapeHtml(error.message)}</p><p><a class="btn" href="/records/new">Try Again</a></p></section>`,'Issue Failed'));
  }
});
app.get('/revoke', (_req, res) => {
  const qrvid = _req.query.qrvid || '';
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Revoke record</div><h1>Revoke a QRVID.</h1><p>Revocation updates the registry and forces the public verifier to return REVOKED.</p><form method="post" action="/revoke"><label>QRVID</label><input name="qrvid" value="${escapeHtml(qrvid)}" placeholder="QRV-PROD-CERT-000002" required><label>Revocation reason</label><textarea name="reason" rows="3" placeholder="Credential withdrawn, issued in error, account closed..." required></textarea><p><button type="submit">Revoke Record</button></p></form></section>`, 'Revoke QRVID'));
});
app.post('/revoke', async (req, res) => {
  try {
    const result = await revokeRegistryRecord(req.body.qrvid, req.body.reason);
    res.type('html').send(layout(`<section class="card success"><h1>Record Revoked</h1><p>The registry accepted the revocation.</p>${recordCard(result)}<p><a class="btn" href="/records">Back to Records</a></p></section>`, 'Record Revoked'));
  } catch (error) {
    res.status(502).type('html').send(layout(`<section class="card error"><h1>Revoke Failed</h1><p>${escapeHtml(error.message)}</p><p><a class="btn" href="/revoke">Try Again</a></p></section>`, 'Revoke Failed'));
  }
});
app.get('/api-keys', (_req, res) => {
  res.type('html').send(layout(`${pageHeader('API keys', 'Use issuer API keys to automate record creation and revocation from your own systems.')}<section class="card"><h2>Configured key status</h2><p class="mono">ISSUER_API_KEY / REGISTRY_API_KEY configured: ${ISSUER_API_KEY ? 'YES' : 'NO'}</p><p>For production, create issuer-scoped keys in the registry authority, store them in Hostinger environment variables, and rotate immediately if a key appears in screenshots or support tickets.</p><h3>Automation endpoints</h3><ul><li><span class="mono">POST /api/issue</span> creates a record.</li><li><span class="mono">POST /api/revoke/:qrvid</span> revokes a record.</li><li><span class="mono">POST /api/analytics/scan</span> records a verification scan.</li></ul></section>`, 'Issuer API Keys'));
});
app.get('/settings', (_req, res) => {
  res.type('html').send(layout(`${pageHeader('Issuer settings', 'Confirm production URLs and runtime configuration before issuing customer records.')}<section class="card"><h2>Environment</h2><p class="mono">APP_BASE_URL=${escapeHtml(APP_BASE_URL)}</p><p class="mono">VERIFY_BASE_URL=${escapeHtml(VERIFY_BASE_URL)}</p><p class="mono">REGISTRY_BASE_URL=${escapeHtml(REGISTRY_BASE_URL)}</p><p class="mono">APP_VERSION=${escapeHtml(VERSION)}</p><p class="mono">RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS}</p><p class="mono">RATE_LIMIT_MAX=${RATE_LIMIT_MAX}</p></section>`, 'Issuer Settings'));
});
app.get('/billing', (_req, res) => {
  res.type('html').send(layout(`${pageHeader('Billing', 'Monetize QR-V issuance with paid issuer plans tied to record volume and scan analytics.')}<section class="grid"><div class="card"><h2>Starter</h2><p class="stat">$99</p><p>For pilots and first certificate programs.</p></div><div class="card"><h2>Growth</h2><p class="stat">$299</p><p>For production issuers with larger monthly volume.</p></div><div class="card"><h2>Enterprise</h2><p class="stat">Custom</p><p>Dedicated support, SLAs, and custom integrations.</p></div></section><section class="card"><h2>Stripe readiness</h2><p class="mono">STRIPE_SECRET_KEY configured: ${process.env.STRIPE_SECRET_KEY ? 'YES' : 'NO'}</p><p class="mono">STRIPE_PRICE_STARTER configured: ${process.env.STRIPE_PRICE_STARTER ? 'YES' : 'NO'}</p><p class="mono">STRIPE_PRICE_GROWTH configured: ${process.env.STRIPE_PRICE_GROWTH ? 'YES' : 'NO'}</p></section>`, 'Issuer Billing'));
});

app.post('/api/issue', async (req, res) => {
  try {
    const { type = 'certificate', issuer = DEFAULT_ISSUER_NAME, owner, title = 'Untitled QR-V record', expiresAt = null, payload = {} } = req.body;
    if (!owner) return res.status(400).json({ ok: false, status: 'INVALID_FORMAT', error: 'owner is required' });
    const result = await createRegistryRecord({ type, issuer, owner, title, expiresAt, payload });
    addAudit('record.created', { qrvid: result.qrvid, type });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    res.status(502).json({ ok: false, status: 'UNAVAILABLE', error: error.message });
  }
});
app.get('/api/records', (_req, res) => res.json({ ok: true, records: getRecords() }));
app.get('/api/records/:qrvid', async (req, res) => {
  try {
    const record = issuedRecords.get(req.params.qrvid) || await fetchRegistryRecord(req.params.qrvid);
    res.json({ ok: true, ...record });
  } catch (error) {
    res.status(404).json({ ok: false, qrvid: req.params.qrvid, status: 'NOT_FOUND', error: error.message });
  }
});
app.post('/api/revoke/:qrvid', async (req, res) => {
  try {
    const result = await revokeRegistryRecord(req.params.qrvid, req.body?.reason || null);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(502).json({ ok: false, status: 'UNAVAILABLE', error: error.message });
  }
});
app.post('/api/analytics/scan', (req, res) => {
  const qrvid = String(req.body?.qrvid || '').trim();
  if (!qrvid) return res.status(400).json({ ok: false, status: 'INVALID_FORMAT', error: 'qrvid is required' });
  const scans = Number(scanCounts.get(qrvid) || 0) + 1;
  scanCounts.set(qrvid, scans);
  if (issuedRecords.has(qrvid)) rememberRecord({ ...issuedRecords.get(qrvid), scans });
  addAudit('record.scanned', { qrvid, scans });
  res.json({ ok: true, qrvid, scans, timestamp: now() });
});

app.use((req, res) => res.status(404).type('html').send(layout(`<section class="card error"><h1>Not Found</h1><p>The requested issuer route does not exist.</p><p class="mono">${escapeHtml(req.path)}</p></section>`, 'Not Found')));
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 && isProduction ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log(`issuer-qrv running on ${PORT}`));
server.on('error', (error) => console.error('Server startup error:', error));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
