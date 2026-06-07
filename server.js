require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

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

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

function now() { return new Date().toISOString(); }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function authHeaders() { return ISSUER_API_KEY ? { authorization: `Bearer ${ISSUER_API_KEY}` } : {}; }

function layout(body, title = 'QR-V Issuer Portal') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>:root{--bg:#061126;--panel:#101f42;--line:#2d477a;--gold:#f2d06b;--cyan:#62cbff;--text:#eef4ff;--muted:#b7c6e6;--green:#22c55e;--red:#ef4444}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top,#14366f,#061126 52%,#030711);color:var(--text)}.wrap{max-width:1080px;margin:0 auto;padding:30px 20px}.nav{display:flex;justify-content:space-between;gap:16px;align-items:center}.brand{font-weight:900;letter-spacing:.08em}.nav a{color:#dbeafe;text-decoration:none;margin-left:14px}.hero,.card{background:rgba(16,31,66,.9);border:1px solid var(--line);border-radius:24px;padding:26px;margin-top:24px}h1{font-size:clamp(38px,7vw,72px);line-height:1;margin:10px 0}p,li{color:var(--muted);font-size:17px;line-height:1.6}.eyebrow{color:var(--gold);font-size:13px;text-transform:uppercase;letter-spacing:.14em;font-weight:900}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.btn,button{display:inline-block;border:0;border-radius:999px;background:var(--gold);color:#071126;font-weight:900;padding:13px 18px;text-decoration:none;cursor:pointer}.btn.alt{background:transparent;border:1px solid var(--line);color:#fff}input,textarea{width:100%;padding:14px;border-radius:14px;border:1px solid #3a5288;background:#081735;color:#fff;font-size:16px}label{display:block;margin:12px 0 6px;font-weight:800}.mono{font-family:ui-monospace,Menlo,monospace;color:#dbeafe;word-break:break-word}.success{border-left:4px solid var(--green)}.error{border-left:4px solid var(--red)}@media(max-width:800px){.grid{grid-template-columns:1fr}.nav{align-items:flex-start;flex-direction:column}.nav a{margin:0 10px 0 0}}</style></head><body><div class="wrap"><nav class="nav"><div class="brand">QR-V™ ISSUER</div><div><a href="${VERIFY_BASE_URL}">Verify</a><a href="${REGISTRY_BASE_URL}">Registry</a><a href="/health">Health</a></div></nav>${body}</div></body></html>`;
}

async function createRegistryRecord({ type, issuer, owner, payload }) {
  const response = await fetch(`${REGISTRY_BASE_URL}/registry/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ type, issuer, owner, payload })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Registry create failed: ${response.status}`);
  return body;
}

async function revokeRegistryRecord(qrvid, reason) {
  const response = await fetch(`${REGISTRY_BASE_URL}/registry/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Registry revoke failed: ${response.status}`);
  return body;
}

app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'issuer-qrv', version: VERSION, timestamp: now() }));
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/version', (_req, res) => res.json({ service: 'issuer-qrv', version: VERSION, appBaseUrl: APP_BASE_URL, registryBaseUrl: REGISTRY_BASE_URL, verifyBaseUrl: VERIFY_BASE_URL }));
app.get('/readyz', async (_req, res) => {
  try {
    const r = await fetch(`${REGISTRY_BASE_URL}/ready`, { headers: { accept: 'application/json' } });
    const registry = await r.json().catch(() => ({}));
    res.status(r.ok ? 200 : 503).json({ ready: r.ok, registry, writeAuthConfigured: Boolean(ISSUER_API_KEY) });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message, writeAuthConfigured: Boolean(ISSUER_API_KEY) });
  }
});

app.get('/', (_req, res) => {
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">QR-V™ Issuer Portal</div><h1>Issue verifiable records.</h1><p>Create registry-backed certificates and trust-sensitive records that resolve through QR-V public verification.</p><p><a class="btn" href="/issue">Issue Certificate</a> <a class="btn alt" href="${VERIFY_BASE_URL}">Open Verify Portal</a></p></section><section class="grid"><div class="card"><h3>Create</h3><p>Submit certificate metadata and create an authoritative registry entry.</p></div><div class="card"><h3>Bind</h3><p>Receive a QRVID and verification URL for documents, certificates, and credentials.</p></div><div class="card"><h3>Revoke</h3><p>Invalidate records when credentials are withdrawn or no longer current.</p></div></section><section class="card"><h2>Service Configuration</h2><p class="mono">Registry: ${REGISTRY_BASE_URL}</p><p class="mono">Verify: ${VERIFY_BASE_URL}</p><p class="mono">Write Auth Configured: ${ISSUER_API_KEY ? 'YES' : 'NO'}</p></section>`));
});

app.get('/issue', (_req, res) => {
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Issue Certificate</div><h1>Create a QR-V certificate record.</h1><form method="post" action="/issue"><label>Issuer</label><input name="issuer" value="${escapeHtml(DEFAULT_ISSUER_NAME)}" required><label>Recipient / Subject</label><input name="owner" placeholder="Jane Smith" required><label>Certificate Title</label><input name="title" placeholder="Advanced Verification Certificate" required><label>Record Type</label><input name="type" value="certificate" required><label>Metadata</label><textarea name="metadata" rows="4" placeholder="Course, credential, program, or notes"></textarea><p><button type="submit">Create Verifiable Record</button></p></form></section>`));
});

app.post('/issue', async (req, res) => {
  try {
    const { issuer, owner, title, type, metadata } = req.body;
    const result = await createRegistryRecord({ type: type || 'certificate', issuer, owner, payload: { title, metadata, source: 'issuer-qrv', issuedAt: now() } });
    const verifyUrl = result.verifyUrl || `${VERIFY_BASE_URL}/${result.qrvid}`;
    res.type('html').send(layout(`<section class="card success"><h1>Record Issued</h1><p>Certificate record created successfully.</p><p><strong>QRVID</strong></p><p class="mono">${escapeHtml(result.qrvid)}</p><p><strong>Hash</strong></p><p class="mono">${escapeHtml(result.hash)}</p><p><a class="btn" href="${verifyUrl}">Open Verification Page</a> <a class="btn alt" href="/issue">Issue Another</a></p></section>`,'Record Issued'));
  } catch (error) {
    res.status(500).type('html').send(layout(`<section class="card error"><h1>Issue Failed</h1><p>${escapeHtml(error.message)}</p><p><a class="btn" href="/issue">Try Again</a></p></section>`,'Issue Failed'));
  }
});

app.post('/api/issue', async (req, res) => {
  try {
    const { type = 'certificate', issuer = DEFAULT_ISSUER_NAME, owner, payload = {} } = req.body;
    if (!owner) return res.status(400).json({ status: 'INVALID_REQUEST', error: 'owner is required' });
    const result = await createRegistryRecord({ type, issuer, owner, payload });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

app.post('/api/revoke/:qrvid', async (req, res) => {
  try {
    const result = await revokeRegistryRecord(req.params.qrvid, req.body?.reason || null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
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
