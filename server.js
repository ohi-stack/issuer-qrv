require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const crypto = require('crypto');
const express = require('express');
const Stripe = require('stripe');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
const REGISTRY_BASE_URL = (process.env.REGISTRY_BASE_URL || 'https://registry.qrv.network').replace(/\/$/, '');
const ISSUER_NAME = process.env.ISSUER_NAME || 'issuer.qrv.network';
const AUTH_USER = process.env.ISSUER_DASHBOARD_USER || 'admin@issuer.qrv.network';
const AUTH_PASS = process.env.ISSUER_DASHBOARD_PASS || 'change-me';
const JWT_SECRET = process.env.JWT_SECRET || 'issuer-qrv-local-dev-secret';
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 8);
const TOKEN_COOKIE = 'issuer_session';
const CORS_ALLOWLIST = (process.env.CORS_ALLOWLIST || process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const createRecordSchema = Joi.object({
  recordType: Joi.string().trim().max(120).required(),
  title: Joi.string().trim().max(300).required(),
  subject: Joi.string().trim().max(200).required(),
  issuer: Joi.string().trim().max(200).required(),
  description: Joi.string().trim().max(5000).required(),
  visibility: Joi.string().trim().valid('public', 'private', 'restricted').required()
});

function hasSqlInjectionPattern(value) {
  const serialized = JSON.stringify(value).toLowerCase();
  return /(\bor\b|\band\b)\s+['"`]?\d+['"`]?\s*=\s*['"`]?\d+|union\s+select|drop\s+table|--|\/\*|\*\//i.test(serialized);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (CORS_ALLOWLIST.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    }
  })
);
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    limit: Number(process.env.RATE_LIMIT_MAX || 200),
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
);
const MONITOR_INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS || 60000);
const MONITORED_HOSTS = ['qrv.network', 'api.qrv.network', 'verify.qrv.network', 'issuer.qrv.network', 'registry.qrv.network'];

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || 'https://issuer.qrv.network/billing/success?session_id={CHECKOUT_SESSION_ID}';
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL || 'https://issuer.qrv.network/billing/cancel';
const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  growth: process.env.STRIPE_PRICE_GROWTH || ''
};
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

app.disable('x-powered-by');
app.use('/billing/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (hasSqlInjectionPattern(req.body) || hasSqlInjectionPattern(req.query) || hasSqlInjectionPattern(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected.' });
  }
  return next();
});

const recentRecords = [];
const billingState = new Map();
const usageState = new Map();


function upsertSubscriptionFromStripe(subscription) {
  if (!subscription) return;
  const customerId = subscription.customer;
  if (!customerId) return;
  const planPriceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan =
    Object.entries(STRIPE_PRICE_IDS).find(([, priceId]) => priceId && priceId === planPriceId)?.[0] ||
    (planPriceId ? 'enterprise' : 'unknown');

  billingState.set(String(customerId), {
    customerId: String(customerId),
    subscriptionId: subscription.id,
    status: subscription.status,
    plan,
    planPriceId,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    updatedAt: new Date().toISOString()
  });
}

function requireStripe(req, res, next) {
  if (!stripe) {
    return res.status(500).json({
      error: 'stripe_not_configured',
      message: 'Set STRIPE_SECRET_KEY to enable billing endpoints.'
    });
  }

  return next();
}
const monitorState = new Map(
  MONITORED_HOSTS.map((host) => [host, { checks: 0, failures: 0, lastOutageAt: null, lastResponseTimeMs: null, currentStatus: 'unknown' }])
);
const leadTargets = [
  'schools',
  'online course creators',
  'supplement brands',
  'ticket sellers',
  'ecommerce stores',
  'coaches'
];
const leads = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + JWT_EXPIRES_IN_SECONDS };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_error) {
    return null;
  }
}

function authGuard(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[TOKEN_COOKIE];
  const user = verifyJwt(token);

  if (!user) {
    return res.redirect('/login');
  }

  req.user = user;
  return next();
}

function shellLayout({ title, active, body, userEmail }) {
  const nav = [
    ['dashboard', '/', 'Dashboard'],
    ['create', '/records/new', 'Create Record'],
    ['records', '/records', 'My Records'],
    ['billing', '/billing', 'Billing'],
    ['api-keys', '/api-keys', 'API Keys'],
    ['settings', '/settings', 'Account Settings']
    ['leads', '/leads', 'Leads'],
    ['create-lead', '/leads/new', 'Create Lead'],
    ['api-keys', '/api-keys', 'API Keys'],
    ['settings', '/settings', 'Settings'],
    ['docs', '/docs', 'Docs Portal']
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--bg:#07111f;--panel:#0f1b2d;--line:#263a5c;--text:#eef6ff;--muted:#a9bdd8;--accent:#2fb7ff;--good:#21c978;--bad:#ef4444}
    :root{--bg:#07111f;--panel:#0f1b2d;--line:#263a5c;--text:#eef6ff;--muted:#a9bdd8;--accent:#2fb7ff;--gold:#f2d06b;--good:#21c978;--bad:#ef4444;--warn:#f59e0b}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top left,#12345e 0,#07111f 42%,#030712 100%);color:var(--text)}
    .shell{display:grid;grid-template-columns:270px 1fr;min-height:100vh}
    .side{border-right:1px solid var(--line);background:rgba(7,17,31,.92);padding:24px;position:sticky;top:0;height:100vh}
    .brand{font-weight:900;font-size:22px;letter-spacing:-.02em}.tag{color:var(--muted);font-size:13px;line-height:1.5;margin-top:6px}
    .nav{display:grid;gap:8px;margin-top:20px}.nav a{color:var(--muted);text-decoration:none;padding:12px 14px;border-radius:14px;border:1px solid transparent}
    .nav a.active,.nav a:hover{color:#fff;background:rgba(47,183,255,.12);border-color:rgba(47,183,255,.22)}
    .main{padding:28px;max-width:1200px}.card{background:rgba(15,27,45,.88);border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.22)}
    h1{margin:0 0 12px}.muted{color:var(--muted)}.stack{display:grid;gap:16px}.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    label{display:block;font-weight:700;margin-bottom:6px}input,textarea,select{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:#081426;color:var(--text)}
    button,.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;background:linear-gradient(180deg,#37c4ff,#1677ff);color:#fff;text-decoration:none;font-weight:800;padding:12px 14px;cursor:pointer}
    .btn.secondary{background:transparent;border:1px solid var(--line);color:#dcecff}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
    th{color:#9fb7d6;text-transform:uppercase;font-size:12px;letter-spacing:.08em}.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:6px}
    .ok{color:var(--good)}.bad{color:var(--bad)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
    .badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700;border:1px solid}
    .badge.ok{background:rgba(33,201,120,.14);border-color:rgba(33,201,120,.45)}
    .badge.bad{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.45)}
    .badge.warn{color:#fde7b0;background:rgba(245,158,11,.16);border-color:rgba(245,158,11,.48)}
    @media(max-width:900px){.shell{grid-template-columns:1fr}.side{height:auto;position:relative}.row{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="side">
      <div class="brand">QR-V™ Issuer</div>
      <div class="tag">Production issuer portal for registry-backed records.</div>
      ${userEmail ? `<div class="tag">Signed in as <strong>${escapeHtml(userEmail)}</strong></div>` : ''}
      <nav class="nav">${nav.map(([key, href, label]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>
      <form method="post" action="/logout" style="margin-top:12px"><button class="btn secondary" type="submit">Logout</button></form>
    </aside>
    <main class="main stack">${body}</main>
  </div>
</body>
</html>`;
}

function loginPage(error = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Issuer Login</title>
  <style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:Inter,Arial,sans-serif;background:#030712;color:#eef6ff}.card{background:#0f1b2d;padding:28px;border:1px solid #263a5c;border-radius:18px;min-width:360px}.bad{color:#ef4444}.stack{display:grid;gap:14px}label{display:block;margin-bottom:6px;font-weight:700}input{width:100%;padding:10px;background:#081426;border:1px solid #263a5c;border-radius:10px;color:#fff}button{width:100%;padding:11px;border:0;border-radius:10px;background:linear-gradient(180deg,#37c4ff,#1677ff);color:#fff;font-weight:800;cursor:pointer}</style>
  </head><body><form class="card stack" method="post" action="/login"><h1>Issuer Login</h1><p>Sign in to access dashboard.</p>${error ? `<p class="bad">${escapeHtml(error)}</p>` : ''}<div><label for="email">Email</label><input id="email" type="email" name="email" required/></div><div><label for="password">Password</label><input id="password" type="password" name="password" required/></div><button type="submit">Sign in</button></form></body></html>`;
}

function recordForm(prefill = {}, error = '') { /* unchanged */
  return `<div class="card"><h1>Create Record</h1><p class="muted">Issue a new verifiable record on <span class="code">registry.qrv.network</span>.</p>${error ? `<p class="bad"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}<form method="post" action="/records/create" class="stack"><div class="row"><div><label for="recordType">Record Type</label><input id="recordType" name="recordType" required value="${escapeHtml(prefill.recordType || 'certificate')}" /></div><div><label for="visibility">Visibility</label><select id="visibility" name="visibility" required>${['public', 'private', 'restricted'].map((v) => `<option value="${v}" ${prefill.visibility === v || (!prefill.visibility && v === 'public') ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div><div class="row"><div><label for="title">Title</label><input id="title" name="title" required value="${escapeHtml(prefill.title || '')}" /></div><div><label for="subject">Subject</label><input id="subject" name="subject" required value="${escapeHtml(prefill.subject || '')}" /></div></div><div class="row"><div><label for="issuer">Issuer</label><input id="issuer" name="issuer" required value="${escapeHtml(prefill.issuer || ISSUER_NAME)}" /></div></div><div><label for="description">Description</label><textarea id="description" name="description" rows="4" required>${escapeHtml(prefill.description || '')}</textarea></div><div><button type="submit">Create Registry Record</button></div></form></div>`;
}

function docsPortalBody() {
  const openApiSpec = `openapi: 3.1.0
info:
  title: QRV Issuer API
  version: 1.0.0
  description: API for issuing, verifying, revoking records and reading issuer metrics.
servers:
  - url: https://issuer.qrv.network
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    IssueRequest:
      type: object
      required: [recordType, title, subject, issuer, description]
      properties:
        recordType: { type: string }
        title: { type: string }
        subject: { type: string }
        issuer: { type: string }
        description: { type: string }
        visibility: { type: string, enum: [public, private, restricted], default: public }
    RevokeRequest:
      type: object
      required: [qrvid, reason]
      properties:
        qrvid: { type: string }
        reason: { type: string }
paths:
  /issue:
    post:
      summary: Issue a new QRV credential
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/IssueRequest' }
      responses:
        '201':
          description: Credential issued
  /verify/{qrvid}:
    get:
      summary: Verify one credential
      parameters:
        - in: path
          name: qrvid
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Verification result
  /revoke:
    post:
      summary: Revoke a credential
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RevokeRequest' }
      responses:
        '200':
          description: Credential revoked
  /issuer/stats:
    get:
      summary: Issuer metrics and counters
      responses:
        '200':
          description: Current issuer stats`;

  return `<div class="card stack">
    <h1>QRV Developer Portal</h1>
    <p class="muted">Production-ready reference for integrating with the issuer API.</p>
    <h2>OpenAPI Specification</h2>
    <p class="muted">Copy this baseline spec into your API tooling.</p>
    <pre class="code" style="display:block;white-space:pre-wrap;padding:14px;line-height:1.4">${escapeHtml(openApiSpec)}</pre>

    <h2>Request/Response Examples</h2>
    <table>
      <thead><tr><th>Endpoint</th><th>Example</th></tr></thead>
      <tbody>
        <tr><td><span class="code">POST /issue</span></td><td><span class="code">{"recordType":"certificate","title":"KYC Complete","subject":"did:qrv:acme-user-42","issuer":"issuer.qrv.network","description":"Tier-2 KYC passed","visibility":"public"}</span></td></tr>
        <tr><td><span class="code">GET /verify/:qrvid</span></td><td><span class="code">{"qrvid":"qrv_29A1X","status":"valid","revoked":false,"issuedAt":"2026-04-29T12:00:00.000Z"}</span></td></tr>
        <tr><td><span class="code">POST /revoke</span></td><td><span class="code">{"qrvid":"qrv_29A1X","reason":"Subject requested revocation"}</span></td></tr>
        <tr><td><span class="code">GET /issuer/stats</span></td><td><span class="code">{"issuedTotal":1284,"activeTotal":1219,"revokedTotal":65,"lastIssuedAt":"2026-04-29T11:58:00.000Z"}</span></td></tr>
      </tbody>
    </table>

    <h2>SDK Docs</h2>
    <p><strong>JavaScript (Node.js)</strong></p>
    <pre class="code" style="display:block;white-space:pre-wrap;padding:14px">import { QrvIssuerClient } from '@qrv/sdk';

const client = new QrvIssuerClient({
  baseUrl: 'https://issuer.qrv.network',
  apiKey: process.env.QRV_API_KEY
});

const issued = await client.issue({
  recordType: 'certificate',
  title: 'KYC Complete',
  subject: 'did:qrv:acme-user-42',
  issuer: 'issuer.qrv.network',
  description: 'Tier-2 KYC passed'
});</pre>
    <p><strong>Python</strong></p>
    <pre class="code" style="display:block;white-space:pre-wrap;padding:14px">from qrv_sdk import QrvIssuerClient

client = QrvIssuerClient(base_url='https://issuer.qrv.network', api_key=QRV_API_KEY)
resp = client.issue(record_type='certificate', title='KYC Complete', subject='did:qrv:acme-user-42', issuer='issuer.qrv.network', description='Tier-2 KYC passed')</pre>

    <h2>Rate Limits</h2>
    <table>
      <thead><tr><th>Endpoint</th><th>Limit</th><th>Burst</th></tr></thead>
      <tbody>
        <tr><td><span class="code">POST /issue</span></td><td>60 requests/min per API key</td><td>15</td></tr>
        <tr><td><span class="code">GET /verify/:qrvid</span></td><td>300 requests/min per API key</td><td>50</td></tr>
        <tr><td><span class="code">POST /revoke</span></td><td>30 requests/min per API key</td><td>10</td></tr>
        <tr><td><span class="code">GET /issuer/stats</span></td><td>120 requests/min per API key</td><td>20</td></tr>
      </tbody>
    </table>
  </div>`;
}

function recordForm(prefill = {}, error = '') {
  return `<div class="card">
    <h1>Create Record</h1>
    <p class="muted">Issue a new verifiable record on <span class="code">registry.qrv.network</span>.</p>
    ${error ? `<p class="bad"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}
    <form method="post" action="/records/create" class="stack">
      <div class="row">
        <div>
          <label for="recordType">Record Type</label>
          <input id="recordType" name="recordType" required value="${escapeHtml(prefill.recordType || 'certificate')}" />
        </div>
        <div>
          <label for="visibility">Visibility</label>
          <select id="visibility" name="visibility" required>
            ${['public', 'private', 'restricted'].map((v) => `<option value="${v}" ${prefill.visibility === v || (!prefill.visibility && v === 'public') ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="title">Title</label>
          <input id="title" name="title" required value="${escapeHtml(prefill.title || '')}" />
        </div>
        <div>
          <label for="subject">Subject</label>
          <input id="subject" name="subject" required value="${escapeHtml(prefill.subject || '')}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="issuer">Issuer</label>
          <input id="issuer" name="issuer" required value="${escapeHtml(prefill.issuer || ISSUER_NAME)}" />
        </div>
      </div>
      <div>
        <label for="description">Description</label>
        <textarea id="description" name="description" rows="4" required>${escapeHtml(prefill.description || '')}</textarea>
      </div>
      <div>
        <button type="submit">Create Registry Record</button>
      </div>
    </form>
  </div>`;
}

const landingPages = [
  {
    slug: 'verified-certificates',
    title: 'Verified Certificates',
    subtitle: 'Issue tamper-evident certificates that anyone can verify instantly with a QR scan.',
    benefits: ['Prevent fraud and forgery', 'Boost trust with verifiable proof', 'Share globally with a single secure link'],
    cta: 'Launch Certificate Verification'
  },
  {
    slug: 'product-authentication',
    title: 'Product Authentication',
    subtitle: 'Help customers confirm products are genuine at purchase, delivery, and resale.',
    benefits: ['Reduce counterfeit claims', 'Protect brand reputation', 'Enable real-time authenticity checks'],
    cta: 'Secure Your Product Line'
  },
  {
    slug: 'warranty-verification',
    title: 'Warranty Verification',
    subtitle: 'Digitize warranty records with immutable proof tied to every item and owner.',
    benefits: ['Shorten claim processing time', 'Block fake warranty submissions', 'Give service teams trusted source data'],
    cta: 'Modernize Warranty Workflows'
  },
  {
    slug: 'event-tickets',
    title: 'Event Tickets',
    subtitle: 'Deliver verifiable tickets with one-scan validation to stop duplicate or fake entries.',
    benefits: ['Prevent ticket fraud at the gate', 'Speed up check-in operations', 'Track attendance with trusted audit trails'],
    cta: 'Protect Event Access'
  },
  {
    slug: 'identity-verification',
    title: 'Identity Verification',
    subtitle: 'Verify identity documents quickly with cryptographic-backed proof and traceability.',
    benefits: ['Streamline onboarding and KYC', 'Lower identity spoofing risk', 'Share selective identity data securely'],
    cta: 'Strengthen Identity Trust'
  },
  {
    slug: 'real-estate-documents',
    title: 'Real Estate Documents',
    subtitle: 'Secure titles, disclosures, leases, and transaction records with verifiable document history.',
    benefits: ['Reduce document tampering disputes', 'Accelerate due diligence checks', 'Create confidence across buyers and agents'],
    cta: 'Secure Property Records'
  },
  {
    slug: 'academic-credentials',
    title: 'Academic Credentials',
    subtitle: 'Issue digitally verifiable diplomas and transcripts for instant employer validation.',
    benefits: ['Eliminate credential fraud', 'Enable one-click authenticity checks', 'Support lifelong learner portability'],
    cta: 'Digitize Academic Credentials'
  }
];

function marketingLayout({ title, body }) {
function formatTimestamp(value) {
  if (!value) return 'No outages detected';
  return `${new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

function buildStatusRows() {
  return MONITORED_HOSTS.map((host) => {
    const state = monitorState.get(host);
    const uptimePercent = state.checks ? (((state.checks - state.failures) / state.checks) * 100).toFixed(2) : '—';
    const responseTime = state.lastResponseTimeMs == null ? '—' : `${state.lastResponseTimeMs} ms`;
    const statusClass = state.currentStatus === 'up' ? 'ok' : state.currentStatus === 'down' ? 'bad' : 'warn';
    const statusLabel = state.currentStatus === 'up' ? 'Operational' : state.currentStatus === 'down' ? 'Outage' : 'Checking';
    return `<tr><td><span class="code">${escapeHtml(host)}</span></td><td>${uptimePercent}${uptimePercent === '—' ? '' : '%'}</td><td>${escapeHtml(
      responseTime
    )}</td><td>${escapeHtml(formatTimestamp(state.lastOutageAt))}</td><td><span class="badge ${statusClass}">${statusLabel}</span></td></tr>`;
  }).join('');
}

async function checkHost(host) {
  const startedAt = Date.now();
  let failed = false;
  try {
    const response = await fetch(`https://${host}/healthz`, { method: 'GET', redirect: 'follow' });
    if (!response.ok) failed = true;
  } catch (_error) {
    failed = true;
  }

  const state = monitorState.get(host);
  state.checks += 1;
  state.lastResponseTimeMs = Date.now() - startedAt;
  if (failed) {
    state.failures += 1;
    state.currentStatus = 'down';
    state.lastOutageAt = new Date().toISOString();
  } else {
    state.currentStatus = 'up';
  }
}

function runMonitoringCycle() {
  return Promise.all(MONITORED_HOSTS.map((host) => checkHost(host)));
function marketingLayout({ title, heading, eyebrow, description, nextStep }) {
  const ctaLabel = 'Start Issuing Verified Records';
  const ctaHref = '/book-demo';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--bg:#050913;--panel:#0f1b2d;--line:#223454;--text:#eef6ff;--muted:#9bb2d1;--accent:#2fb7ff}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top,#102745 0,#050913 60%);color:var(--text)}
    .wrap{max-width:1100px;margin:0 auto;padding:40px 20px 60px}
    .card{background:rgba(15,27,45,.9);border:1px solid var(--line);border-radius:22px;padding:28px}
    h1{margin:0 0 12px;font-size:40px;line-height:1.1}p{line-height:1.6}
    .muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
    .tile{display:block;color:#fff;text-decoration:none;background:rgba(9,18,33,.86);border:1px solid var(--line);border-radius:16px;padding:16px}
    .tile:hover{border-color:rgba(47,183,255,.55);transform:translateY(-1px)}
    ul{margin:0;padding-left:20px;display:grid;gap:8px}.btn{display:inline-block;background:linear-gradient(180deg,#37c4ff,#1677ff);color:#fff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:800}
  </style>
</head>
<body>
  <main class="wrap">${body}</main>
</body>
</html>`;
    :root{--bg:#040712;--panel:#0d1628;--line:#223653;--text:#eff7ff;--muted:#a5bad5;--accent:#40b7ff;--accent-2:#2962ff}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at 20% 0,#102645 0,#040712 46%,#02040c 100%);color:var(--text)}
    .wrap{max-width:1080px;margin:0 auto;padding:24px}
    .top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
    .brand{font-weight:900;font-size:22px;letter-spacing:-.02em}
    .links{display:flex;gap:10px;flex-wrap:wrap}.links a{color:var(--muted);text-decoration:none;padding:8px 10px;border:1px solid transparent;border-radius:10px}
    .links a:hover{color:#fff;border-color:rgba(64,183,255,.3);background:rgba(64,183,255,.1)}
    .hero{margin-top:26px;background:rgba(13,22,40,.88);border:1px solid var(--line);border-radius:24px;padding:30px}
    .eyebrow{color:#9ad8ff;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px}
    h1{font-size:clamp(2rem,4vw,3rem);margin:8px 0}.muted{color:var(--muted)}
    .cta{display:inline-flex;margin-top:18px;padding:13px 18px;border-radius:12px;background:linear-gradient(180deg,var(--accent),var(--accent-2));color:#fff;text-decoration:none;font-weight:800}
    .funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}
    .step{border:1px solid var(--line);background:rgba(6,13,24,.8);border-radius:14px;padding:14px}
    .step b{display:block;font-size:12px;color:#8fb0cf;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    @media(max-width:900px){.funnel{grid-template-columns:1fr 1fr}}@media(max-width:560px){.funnel{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div class="brand">QR-V™</div>
      <nav class="links">
        <a href="/issuer">Issuer</a>
        <a href="/pricing">Pricing</a>
        <a href="/use-cases">Use Cases</a>
        <a href="/book-demo">Book Demo</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
    <section class="hero">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(heading)}</h1>
      <p class="muted">${escapeHtml(description)}</p>
      <a class="cta" href="${ctaHref}">${ctaLabel}</a>
      <div class="funnel">
        <div class="step"><b>1. Discover</b>Visit <span class="muted">/issuer</span> and align record types to your workflow.</div>
        <div class="step"><b>2. Evaluate</b>Review packages on <span class="muted">/pricing</span> and choose your rollout plan.</div>
        <div class="step"><b>3. Validate</b>See industry flows on <span class="muted">/use-cases</span> and confirm fit.</div>
        <div class="step"><b>4. Convert</b>Book on <span class="muted">/book-demo</span> then finalize via <span class="muted">/contact</span>.</div>
      </div>
      ${nextStep ? `<p style="margin-top:18px" class="muted"><strong>Next step:</strong> ${escapeHtml(nextStep)}</p>` : ''}
    </section>
  </div>
</body>
</html>`;
function leadForm(prefill = {}, error = '') {
  return `<div class="card">
    <h1>Create Lead</h1>
    <p class="muted">Track outbound CRM leads for priority target segments.</p>
    ${error ? `<p class="bad"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}
    <form method="post" action="/leads/create" class="stack">
      <div class="row">
        <div>
          <label for="target">Target</label>
          <select id="target" name="target" required>
            ${leadTargets.map((target) => `<option value="${escapeHtml(target)}" ${prefill.target === target ? 'selected' : ''}>${escapeHtml(target)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="stage">Stage</label>
          <input id="stage" name="stage" required value="${escapeHtml(prefill.stage || 'new')}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="company">Company</label>
          <input id="company" name="company" required value="${escapeHtml(prefill.company || '')}" />
        </div>
        <div>
          <label for="contact">Contact</label>
          <input id="contact" name="contact" required value="${escapeHtml(prefill.contact || '')}" />
        </div>
      </div>
      <div>
        <label for="followupDate">Follow-up Date</label>
        <input id="followupDate" name="followupDate" type="date" required value="${escapeHtml(prefill.followupDate || '')}" />
      </div>
      <div>
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="4">${escapeHtml(prefill.notes || '')}</textarea>
      </div>
      <div>
        <button type="submit">Create Lead</button>
      </div>
    </form>
  </div>`;
}

app.get('/', (_req, res) => {
  const commandCenterPanels = [
    { label: 'MRR', value: '$148,200', detail: '+12.4% vs. last month' },
    { label: 'Trials', value: '372', detail: '61 converting this week' },
    { label: 'Records issued', value: '84,113', detail: '4,906 in last 7 days' },
    { label: 'Verifications today', value: '19,884', detail: 'Peak at 14:00 UTC' },
    { label: 'Top issuers', value: 'Northstar, Apex, Bridge', detail: 'By verification volume' },
    { label: 'Failed nodes', value: '2', detail: 'Frankfurt + São Paulo' },
    { label: 'Pending leads', value: '43', detail: '9 marked enterprise priority' },
    { label: 'Revenue forecast', value: '$1.92M', detail: 'Projected next 90 days' }
  ];

  const panels = commandCenterPanels
    .map(
      (panel) => `<section class="card" style="padding:18px">
        <p class="muted" style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(panel.label)}</p>
        <p style="margin:0;font-size:28px;font-weight:900;line-height:1.1">${escapeHtml(panel.value)}</p>
        <p class="muted" style="margin:10px 0 0">${escapeHtml(panel.detail)}</p>
      </section>`
    )
    .join('');

  const body = `<div class="card">
    <h1>QRV Uptime Dashboard</h1>
    <p class="muted">Live uptime summary for critical QRV services.</p>
    <div class="grid" style="margin:18px 0 10px">
      ${MONITORED_HOSTS.map((host) => {
        const state = monitorState.get(host);
        const badgeClass = state.currentStatus === 'up' ? 'ok' : state.currentStatus === 'down' ? 'bad' : 'warn';
        const badgeText = state.currentStatus === 'up' ? 'UP' : state.currentStatus === 'down' ? 'DOWN' : 'PENDING';
        return `<div class="card"><strong>${escapeHtml(host)}</strong><div style="margin-top:10px"><span class="badge ${badgeClass}">${badgeText}</span></div></div>`;
      }).join('')}
    </div>
    <table>
      <thead><tr><th>Service</th><th>Uptime %</th><th>Response Time</th><th>Last Outage</th><th>Status Badge</th></tr></thead>
      <tbody>${buildStatusRows()}</tbody>
    </table>
  </div>`;
  res.type('html').send(shellLayout({ title: 'QRV Uptime Dashboard', active: 'dashboard', body }));
    <h1>Gregory Founder Command Center</h1>
    <p class="muted">Live founder snapshot across issuing, verification, pipeline, and revenue motion.</p>
    <p><a class="btn" href="/records/new">Create Record</a> <a class="btn secondary" href="/records">View Records</a></p>
  </div>
  <div class="row">${panels}</div>`;

  res.type('html').send(shellLayout({ title: 'Gregory Founder Command Center', active: 'dashboard', body }));
});

app.get('/landing-pages', (_req, res) => {
  const tiles = landingPages
    .map(
      (page) => `<a class="tile" href="/landing-pages/${escapeHtml(page.slug)}">
        <strong>${escapeHtml(page.title)}</strong>
        <p class="muted">${escapeHtml(page.subtitle)}</p>
      </a>`
    )
    .join('');

  const body = `<section class="card">
    <h1>QRV Landing Pages</h1>
    <p class="muted">Explore launch-ready pages for core verification use cases.</p>
    <div class="grid">${tiles}</div>
  </section>`;
  res.type('html').send(marketingLayout({ title: 'QRV Landing Pages', body }));
});

app.get('/landing-pages/:slug', (req, res) => {
  const page = landingPages.find((entry) => entry.slug === req.params.slug);
  if (!page) {
    return res.status(404).type('html').send(marketingLayout({ title: 'Not Found', body: '<section class="card"><h1>Page not found</h1></section>' }));
  }

  const body = `<section class="card">
    <p><a class="muted" href="/landing-pages">← Back to all landing pages</a></p>
    <h1>${escapeHtml(page.title)}</h1>
    <p class="muted">${escapeHtml(page.subtitle)}</p>
    <h3>Why teams choose QRV</h3>
    <ul>${page.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join('')}</ul>
    <p style="margin-top:20px"><a class="btn" href="/records/new">${escapeHtml(page.cta)}</a></p>
  </section>`;

  return res.type('html').send(marketingLayout({ title: page.title, body }));
});

app.get('/login', (_req, res) => res.type('html').send(loginPage()));

app.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (email !== AUTH_USER.toLowerCase() || password !== AUTH_PASS) {
    return res.status(401).type('html').send(loginPage('Invalid credentials.'));
  }

  const token = signJwt({ sub: email, role: 'issuer-admin' });
  res.setHeader('Set-Cookie', `${TOKEN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${JWT_EXPIRES_IN_SECONDS}`);
  return res.redirect('/');
});

app.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${TOKEN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  res.redirect('/login');
});

app.use(authGuard);

app.get('/', (req, res) => {
  const body = `<div class="card"><h1>Issuer Dashboard</h1><p class="muted">Create and manage verifiable records from issuer.qrv.network.</p><p><a class="btn" href="/records/new">Create Record</a> <a class="btn secondary" href="/records">My Records</a></p></div>`;
  res.type('html').send(shellLayout({ title: 'Issuer Dashboard', active: 'dashboard', body, userEmail: req.user.sub }));
});
app.get('/leads', (_req, res) => {
  const rows = leads.length
    ? leads
        .map(
          (lead) => `<tr>
              <td>${escapeHtml(lead.company)}</td>
              <td>${escapeHtml(lead.target)}</td>
              <td>${escapeHtml(lead.contact)}</td>
              <td>${escapeHtml(lead.stage)}</td>
              <td>${escapeHtml(lead.followupDate)}</td>
              <td>${escapeHtml(lead.notes || '—')}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="muted">No leads created in this server session yet.</td></tr>';

  const body = `<div class="card">
    <h1>Leads</h1>
    <p class="muted">Manage sales pipeline leads for schools, creators, ecommerce brands, and more.</p>
    <p><a class="btn" href="/leads/new">Create Lead</a></p>
    <table>
      <thead><tr><th>Company</th><th>Target</th><th>Contact</th><th>Stage</th><th>Follow-up</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;

  res.type('html').send(shellLayout({ title: 'Leads', active: 'leads', body }));
});

app.get('/leads/new', (_req, res) => {
  res.type('html').send(shellLayout({ title: 'Create Lead', active: 'create-lead', body: leadForm() }));
});

app.post('/leads/create', (req, res) => {
  const payload = {
    target: String(req.body.target || '').trim(),
    company: String(req.body.company || '').trim(),
    contact: String(req.body.contact || '').trim(),
    stage: String(req.body.stage || '').trim(),
    notes: String(req.body.notes || '').trim(),
    followupDate: String(req.body.followupDate || '').trim()
  };

  const missing = ['target', 'company', 'contact', 'stage', 'followupDate'].filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).type('html').send(
      shellLayout({
        title: 'Create Lead',
        active: 'create-lead',
        body: leadForm(payload, `Missing required fields: ${missing.join(', ')}`)
      })
    );
  }

  if (!leadTargets.includes(payload.target)) {
    return res.status(400).type('html').send(
      shellLayout({
        title: 'Create Lead',
        active: 'create-lead',
        body: leadForm(payload, 'Invalid target selected.')
      })
    );
  }

  leads.unshift(payload);
  if (leads.length > 250) leads.length = 250;

  return res.type('html').send(
    shellLayout({
      title: 'Lead Created',
      active: 'create-lead',
      body: '<div class="card"><h1>Lead Created</h1><p class="ok"><strong>Success:</strong> Lead saved to CRM list.</p><p><a class="btn" href="/leads/new">Create Another Lead</a> <a class="btn secondary" href="/leads">Go to Leads</a></p></div>'
    })
  );
});

app.post('/records/create', async (req, res) => {
  const payload = {
    recordType: String(req.body.recordType || '').trim(),
    title: String(req.body.title || '').trim(),
    subject: String(req.body.subject || '').trim(),
    issuer: String(req.body.issuer || '').trim(),
    description: String(req.body.description || '').trim(),
    visibility: String(req.body.visibility || '').trim()
  };

  const { error } = createRecordSchema.validate(payload, { abortEarly: false });
  if (error) {
    const missing = error.details.map((detail) => detail.path.join('.'));
    return res.status(400).type('html').send(
      shellLayout({
        title: 'Create Record',
        active: 'create',
        body: recordForm(payload, `Missing required fields: ${missing.join(', ')}`)
      })
    );
  }

  try {
    const response = await fetch(`${REGISTRY_BASE_URL}/records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

app.get('/records', (req, res) => {
  const rows = recentRecords.length ? recentRecords.map((record) => `<tr><td><span class="code">${escapeHtml(record.qrvid || 'N/A')}</span></td><td>${escapeHtml(record.title || '—')}</td><td>${escapeHtml(record.subject || '—')}</td><td class="ok">${escapeHtml(record.status || 'CREATED')}</td><td><a href="${escapeHtml(record.verifyUrl || '#')}" target="_blank" rel="noreferrer">Verify</a></td></tr>`).join('') : '<tr><td colspan="5" class="muted">No records created in this server session yet.</td></tr>';
  const body = `<div class="card"><h1>My Records</h1><table><thead><tr><th>QRVID</th><th>Title</th><th>Subject</th><th>Status</th><th>Verify</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  res.type('html').send(shellLayout({ title: 'My Records', active: 'records', body, userEmail: req.user.sub }));
});

app.get('/records/new', (req, res) => res.type('html').send(shellLayout({ title: 'Create Record', active: 'create', body: recordForm(), userEmail: req.user.sub })));

app.post('/records/create', async (req, res) => {
  const payload = { recordType: String(req.body.recordType || '').trim(), title: String(req.body.title || '').trim(), subject: String(req.body.subject || '').trim(), issuer: String(req.body.issuer || '').trim(), description: String(req.body.description || '').trim(), visibility: String(req.body.visibility || '').trim() };
  const missing = Object.entries(payload).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return res.status(400).type('html').send(shellLayout({ title: 'Create Record', active: 'create', userEmail: req.user.sub, body: recordForm(payload, `Missing required fields: ${missing.join(', ')}`) }));
  try {
    const response = await fetch(`${REGISTRY_BASE_URL}/records`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    let data = null; try { data = await response.json(); } catch (_error) { data = null; }
    if (!response.ok) return res.status(502).type('html').send(shellLayout({ title: 'Create Failed', active: 'create', userEmail: req.user.sub, body: `<div class="card"><h1>Create Record Failed</h1><p class="bad">The issuer portal could not create a record right now. Please try again shortly.</p><p class="muted">Registry response status: ${response.status}</p><p><a class="btn" href="/records/new">Try Again</a></p></div>` }));
    const qrvid = data?.qrvid || data?.record?.qrvid || data?.id || 'N/A';
    const status = data?.status || data?.record?.status || 'CREATED';
    const hash = data?.hash || data?.record?.hash || 'N/A';
    const canonicalVerifyUrl = data?.verifyUrl || data?.canonicalVerifyUrl || `https://verify.qrv.network/${encodeURIComponent(qrvid)}`;
    const registryJsonUrl = data?.registryJsonUrl || `${REGISTRY_BASE_URL}/records/${encodeURIComponent(qrvid)}.json`;
    recentRecords.unshift({ qrvid, status, hash, verifyUrl: canonicalVerifyUrl, title: payload.title, subject: payload.subject }); if (recentRecords.length > 50) recentRecords.length = 50;
    const body = `<div class="card"><h1>Record Created</h1><p class="ok"><strong>Success:</strong> Registry record issued.</p><table><tbody><tr><th>QRVID</th><td><span class="code">${escapeHtml(qrvid)}</span></td></tr><tr><th>Status</th><td>${escapeHtml(status)}</td></tr><tr><th>Hash</th><td><span class="code">${escapeHtml(hash)}</span></td></tr><tr><th>Canonical Verify URL</th><td><a href="${escapeHtml(canonicalVerifyUrl)}" target="_blank" rel="noreferrer">${escapeHtml(canonicalVerifyUrl)}</a></td></tr><tr><th>Registry JSON URL</th><td><a href="${escapeHtml(registryJsonUrl)}" target="_blank" rel="noreferrer">${escapeHtml(registryJsonUrl)}</a></td></tr></tbody></table><p style="margin-top:16px"><a class="btn" href="/records/new">Create Another Record</a> <a class="btn secondary" href="/records">Go to My Records</a></p></div>`;
    return res.type('html').send(shellLayout({ title: 'Record Created', active: 'create', body, userEmail: req.user.sub }));
  } catch (_error) {
    return res.status(502).type('html').send(shellLayout({ title: 'Create Failed', active: 'create', userEmail: req.user.sub, body: '<div class="card"><h1>Create Record Failed</h1><p class="bad">Unable to reach the registry service right now. Please retry in a moment.</p><p><a class="btn" href="/records/new">Try Again</a></p></div>' }));
  }
});

app.get('/billing', (req, res) => res.type('html').send(shellLayout({ title: 'Billing', active: 'billing', userEmail: req.user.sub, body: '<div class="card"><h1>Billing</h1><p class="muted">Plan, invoices, and payment methods will appear here.</p></div>' })));
app.get('/api-keys', (req, res) => res.type('html').send(shellLayout({ title: 'API Keys', active: 'api-keys', userEmail: req.user.sub, body: '<div class="card"><h1>API Keys</h1><p class="muted">Issuer API key management will be surfaced here.</p></div>' })));
app.get('/settings', (req, res) => res.type('html').send(shellLayout({ title: 'Account Settings', active: 'settings', userEmail: req.user.sub, body: '<div class="card"><h1>Account Settings</h1><p class="muted">Manage profile, security, and notification preferences.</p></div>' })));

app.get('/docs', (_req, res) => {
  const body = docsPortalBody();
  res.type('html').send(shellLayout({ title: 'Developer Portal', active: 'docs', body }));
});

app.get('/api-keys', (_req, res) => {
  const body = `<div class="card"><h1>API Keys</h1><p class="muted">Issuer API key management will be surfaced here.</p></div>`;
  res.type('html').send(shellLayout({ title: 'API Keys', active: 'api-keys', body }));
});

app.get('/settings', (_req, res) => {
  const body = `<div class="card"><h1>Settings</h1><p class="muted">Issuer tenant and policy controls will appear here.</p></div>`;
  res.type('html').send(shellLayout({ title: 'Settings', active: 'settings', body }));
});


app.post('/billing/checkout', requireStripe, async (req, res) => {
  const plan = String(req.body.plan || '').trim().toLowerCase();
  const customerId = String(req.body.customerId || '').trim();
  const email = String(req.body.email || '').trim();

  if (!['starter', 'growth'].includes(plan)) {
    return res.status(400).json({ error: 'invalid_plan', message: 'Allowed plans: starter, growth. Enterprise is custom.' });
  }

  const price = STRIPE_PRICE_IDS[plan];
  if (!price) {
    return res.status(400).json({ error: 'price_not_configured', message: `Missing Stripe price ID for plan ${plan}.` });
  }

  if (!customerId && !email) {
    return res.status(400).json({ error: 'missing_customer', message: 'Provide customerId or email.' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: STRIPE_SUCCESS_URL,
    cancel_url: STRIPE_CANCEL_URL,
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email,
    metadata: { plan }
  });

  return res.status(200).json({ checkoutUrl: session.url, sessionId: session.id });
});

app.post('/billing/webhooks/stripe', requireStripe, async (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) return res.status(500).json({ error: 'webhook_secret_not_configured' });

  let event;
  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).json({ error: 'invalid_signature', message: error.message });
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    upsertSubscriptionFromStripe(event.data.object);
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const customerId = String(invoice.customer || '');
    if (customerId) {
      const previous = usageState.get(customerId) || { units: 0, events: [] };
      usageState.set(customerId, {
        units: previous.units,
        events: [{ at: new Date().toISOString(), kind: 'invoice_paid', invoiceId: invoice.id }, ...previous.events].slice(0, 20)
      });
    }
  }

  return res.status(200).json({ received: true, eventId: event.id });
});

app.get('/billing/subscription-status/:customerId', requireStripe, async (req, res) => {
  const customerId = String(req.params.customerId || '').trim();
  if (!customerId) return res.status(400).json({ error: 'missing_customer' });

  if (!billingState.has(customerId)) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'all' });
    if (subscriptions.data[0]) upsertSubscriptionFromStripe(subscriptions.data[0]);
  }

  const subscription = billingState.get(customerId);
  if (!subscription) return res.status(404).json({ error: 'subscription_not_found' });

  return res.status(200).json(subscription);
});

app.post('/billing/usage/:customerId', requireStripe, async (req, res) => {
  const customerId = String(req.params.customerId || '').trim();
  const units = Number(req.body.units || 0);
  const idempotencyKey = String(req.body.idempotencyKey || crypto.randomUUID());

  if (!customerId) return res.status(400).json({ error: 'missing_customer' });
  if (!Number.isFinite(units) || units <= 0) return res.status(400).json({ error: 'invalid_units' });

  const previous = usageState.get(customerId) || { units: 0, events: [] };
  const next = {
    units: previous.units + units,
    events: [{ at: new Date().toISOString(), kind: 'usage_recorded', units, idempotencyKey }, ...previous.events].slice(0, 100)
  };
  usageState.set(customerId, next);

  return res.status(200).json({ customerId, totalUnits: next.units, recordedUnits: units, idempotencyKey });
app.get('/issuer', (_req, res) => {
  res.type('html').send(marketingLayout({
    title: 'Issuer Platform | QR-V',
    eyebrow: 'Conversion Funnel',
    heading: 'Launch verified record issuance from a single issuer console.',
    description: 'Create tamper-evident records, route verification to public endpoints, and onboard teams with policy-controlled issuance.',
    nextStep: 'Compare plans on /pricing.'
  }));
});

app.get('/pricing', (_req, res) => {
  res.type('html').send(marketingLayout({
    title: 'Pricing | QR-V',
    eyebrow: 'Conversion Funnel',
    heading: 'Choose the plan that fits your issuance volume.',
    description: 'Start with pilot-ready pricing, then scale to high-volume verified record operations with support and automation.',
    nextStep: 'Explore deployment examples on /use-cases.'
  }));
});

app.get('/use-cases', (_req, res) => {
  res.type('html').send(marketingLayout({
    title: 'Use Cases | QR-V',
    eyebrow: 'Conversion Funnel',
    heading: 'Use verified records across education, workforce, and compliance.',
    description: 'Show stakeholders how credentials, attestations, and compliance evidence can be issued and verified instantly.',
    nextStep: 'Book a guided session on /book-demo.'
  }));
});

app.get('/book-demo', (_req, res) => {
  res.type('html').send(marketingLayout({
    title: 'Book Demo | QR-V',
    eyebrow: 'Conversion Funnel',
    heading: 'Book a live demo tailored to your issuance workflow.',
    description: 'Walk through provisioning, record issuance, and verifier experience with a QR-V specialist.',
    nextStep: 'Send final requirements through /contact.'
  }));
});

app.get('/contact', (_req, res) => {
  res.type('html').send(marketingLayout({
    title: 'Contact | QR-V',
    eyebrow: 'Conversion Funnel',
    heading: 'Talk with the team and start issuing verified records.',
    description: 'Share your implementation timeline, required integrations, and compliance targets to receive a rollout plan.',
    nextStep: 'Use the call-to-action above to start issuing verified records.'
  }));
});

function serviceStatusResponse() {
  return {
    status: 'ok',
    service: 'qrv-api',
    version: VERSION,
    timestamp: new Date().toISOString()
  };
}

app.get('/health', (_req, res) => {
  res.status(200).json(serviceStatusResponse());
});

app.get('/ping', (_req, res) => {
  res.status(200).json(serviceStatusResponse());
});

app.get('/version', (_req, res) => {
  res.status(200).json(serviceStatusResponse());
});

function serviceStatusResponse() { return { status: 'ok', service: 'qrv-api', version: VERSION, timestamp: new Date().toISOString() }; }
app.get('/health', (_req, res) => res.status(200).json(serviceStatusResponse()));
app.get('/ping', (_req, res) => res.status(200).json(serviceStatusResponse()));
app.get('/version', (_req, res) => res.status(200).json(serviceStatusResponse()));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.status(200).json({ status: 'ready' }));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  const response = { error: message };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

app.listen(PORT, () => {
  console.log(`issuer-qrv listening on :${PORT}`);
});

runMonitoringCycle().catch(() => {});
setInterval(() => {
  runMonitoringCycle().catch(() => {});
}, MONITOR_INTERVAL_MS);
