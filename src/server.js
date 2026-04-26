const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { Pool } = require('pg');
const crypto = require('crypto');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_API_KEY;
const ISSUER_TOKEN = process.env.ISSUER_TOKEN || process.env.ISSUER_API_KEY_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || process.env.ISSUER_JWT_SECRET;
const SIGNING_SECRET = process.env.SIGNING_SECRET || process.env.QRV_SIGNING_SECRET;

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const HOST_ROLE = String(process.env.HOST_ROLE || 'verify').toLowerCase();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://issuer.qrv.network';
const ISSUER_LOGIN_PATH = process.env.ISSUER_LOGIN_PATH || '/login';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 100);
const VALID_HOST_ROLES = new Set(['issuer', 'verify', 'api']);

if (!process.env.ADMIN_TOKEN && process.env.ADMIN_API_KEY) {
  console.warn('[config] ADMIN_API_KEY is deprecated, prefer ADMIN_TOKEN');
}
if (!process.env.ISSUER_TOKEN && process.env.ISSUER_API_KEY_SECRET) {
  console.warn('[config] ISSUER_API_KEY_SECRET is deprecated, prefer ISSUER_TOKEN');
}
if (!process.env.JWT_SECRET && process.env.ISSUER_JWT_SECRET) {
  console.warn('[config] ISSUER_JWT_SECRET is deprecated, prefer JWT_SECRET');
}
if (!process.env.SIGNING_SECRET && process.env.QRV_SIGNING_SECRET) {
  console.warn('[config] QRV_SIGNING_SECRET is deprecated, prefer SIGNING_SECRET');
}

function getConfigIssues() {
  const issues = [];
  if (!process.env.DATABASE_URL) issues.push('DATABASE_URL is missing');
  if (!SIGNING_SECRET) issues.push('SIGNING_SECRET is missing');
  if (!ISSUER_TOKEN) issues.push('ISSUER_TOKEN (or ISSUER_API_KEY_SECRET) is missing');
  if (!JWT_SECRET) issues.push('JWT_SECRET (or ISSUER_JWT_SECRET) is missing');
  if (!ADMIN_TOKEN) issues.push('ADMIN_TOKEN (or ADMIN_API_KEY) is missing');
  if (!VALID_HOST_ROLES.has(HOST_ROLE)) issues.push('HOST_ROLE must be issuer, verify, or api');
  return issues;
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

const memoryRecords = new Map();
const metrics = {
  requestsTotal: 0,
  routes: {}
};
const rateLimitStore = new Map();

function incrementRouteMetric(routeKey) {
  metrics.routes[routeKey] = (metrics.routes[routeKey] || 0) + 1;
}

app.use((req, _res, next) => {
  metrics.requestsTotal += 1;
  incrementRouteMetric(`${req.method} ${req.route?.path || req.path}`);
  next();
});

function getClientId(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
}

function rateLimit(req, res, next) {
  const clientId = getClientId(req);
  const now = Date.now();
  const existing = rateLimitStore.get(clientId) || { count: 0, windowStart: now };

  if (now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    existing.count = 0;
    existing.windowStart = now;
  }

  existing.count += 1;
  rateLimitStore.set(clientId, existing);

  if (existing.count > RATE_LIMIT_MAX) {
    return sendError(res, 429, 'RATE_LIMITED', 'Rate limit exceeded');
  }

  return next();
}

const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
const QRVID_FORMAT = /^[A-Z0-9][A-Z0-9-]{5,127}$/;

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...extra
    }
  });
}

function authByToken(expectedToken) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    const tokenBuffer = Buffer.from(String(token || ''), 'utf8');
    const expectedBuffer = Buffer.from(String(expectedToken || ''), 'utf8');
    const valid =
      expectedBuffer.length > 0 &&
      expectedBuffer.length === tokenBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, tokenBuffer);
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  };
}

const adminAuth = authByToken(ADMIN_TOKEN);
const issuerAuth = authByToken(ISSUER_TOKEN);

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function isValidIssuerJwt(token) {
  try {
    if (!JWT_SECRET || !token || !token.includes('.')) return false;
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return false;
    const header = JSON.parse(decodeBase64Url(headerB64));
    if (header.alg !== 'HS256') return false;
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSig = base64UrlEncode(crypto.createHmac('sha256', JWT_SECRET).update(signingInput).digest());
    const expectedBuffer = Buffer.from(expectedSig, 'utf8');
    const providedBuffer = Buffer.from(signatureB64, 'utf8');
    if (expectedBuffer.length !== providedBuffer.length) return false;
    if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) return false;
    const payload = JSON.parse(decodeBase64Url(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && Number(payload.exp) < now) return false;
    return true;
  } catch (_error) {
    return false;
  }
}

function issuerTokenOrJwtAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  const apiKey = req.headers['x-api-key']?.toString().trim();
  const bearerMatchesIssuerToken = token && ISSUER_TOKEN && token === ISSUER_TOKEN;
  const apiKeyMatchesIssuerToken = apiKey && ISSUER_TOKEN && apiKey === ISSUER_TOKEN;
  const bearerIsJwt = isValidIssuerJwt(token);
  if (bearerMatchesIssuerToken || apiKeyMatchesIssuerToken || bearerIsJwt) {
    return next();
  }
  return sendError(res, 401, 'UNAUTHORIZED', 'Issuer authentication required');
}

function assertNoProdMemoryFallback() {
  if (IS_PRODUCTION) {
    throw new Error('In-memory fallback is disabled in production');
  }
}

async function auditLog(eventType, details) {
  const payload = {
    eventType,
    details,
    createdAt: new Date().toISOString()
  };
  console.log('[audit]', JSON.stringify(payload));

  try {
    await pool.query(
      `INSERT INTO registry_audit_log(event_type, details)
       VALUES ($1, $2::jsonb)`,
      [eventType, JSON.stringify(details)]
    );
  } catch (error) {
    console.warn('[audit] failed to persist', error.message);
  }
}

async function migrateCertificateV1() {
  try {
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS registry_qrvid_seq START WITH 1 INCREMENT BY 1;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS registry_records (
        qrvid text PRIMARY KEY,
        title text NOT NULL,
        subject text NOT NULL,
        issuer text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        certificate_version integer NOT NULL DEFAULT 1
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS registry_audit_log (
        id bigserial PRIMARY KEY,
        event_type text NOT NULL,
        details jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE registry_records
      ADD COLUMN IF NOT EXISTS certificate_version integer NOT NULL DEFAULT 1;
    `);

    await pool.query(
      `INSERT INTO registry_records(qrvid, title, subject, issuer, status, certificate_version)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (qrvid) DO NOTHING`,
      [
        'QRV-PROD-CERT-000001',
        'QR-V Production Seed Certificate',
        'QR-V Production Test Subject',
        'QR-V Production Issuer',
        'active',
        1
      ]
    );
  } catch (error) {
    if (IS_PRODUCTION) {
      throw new Error(`[db] migration failed in production: ${error.message}`);
    }
    console.warn('[db] migration skipped, falling back to in-memory mode');
    memoryRecords.set('QRV-PROD-CERT-000001', {
      qrvid: 'QRV-PROD-CERT-000001',
      title: 'QR-V Production Seed Certificate',
      subject: 'QR-V Production Test Subject',
      issuer: 'QR-V Production Issuer',
      status: 'active',
      certificate_version: 1,
      created_at: new Date().toISOString(),
      revoked_at: null
    });
  }
}

async function readRecordById(qrvid) {
  try {
    const result = await pool.query('SELECT * FROM registry_records WHERE qrvid = $1', [qrvid]);
    if (result.rows[0]) return result.rows[0];
    if (IS_PRODUCTION) return null;
    return memoryRecords.get(qrvid);
  } catch (error) {
    if (IS_PRODUCTION) {
      throw new Error(`[db] read failed in production: ${error.message}`);
    }
    return memoryRecords.get(qrvid);
  }
}

function normalizeQrvid(rawValue) {
  try {
    const decoded = decodeURIComponent(String(rawValue || '').trim());
    return decoded.toUpperCase().replace(/\s+/g, '');
  } catch (_error) {
    return '';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: Inter, Arial, sans-serif; margin: 0; background: #0b1020; color: #e6e9f5; }
    .wrap { max-width: 880px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #121a33; border: 1px solid #293357; border-radius: 14px; padding: 24px; }
    h1, h2 { margin-top: 0; color: #fff; }
    p, li { line-height: 1.5; }
    .muted { color: #b2bddf; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; }
    input[type=text] { flex: 1 1 280px; padding: 12px; border-radius: 8px; border: 1px solid #40508b; background: #0f1730; color: #fff; }
    button, .btn { padding: 12px 16px; border: 0; border-radius: 8px; background: #5b7cfa; color: #fff; text-decoration: none; cursor: pointer; font-weight: 600; }
    .links a { color: #9ec1ff; margin-right: 16px; }
    .status { font-weight: 700; padding: 4px 8px; border-radius: 999px; display: inline-block; }
    .VERIFIED { background: #1e7f4f; color: #d8ffe8; }
    .REVOKED, .EXPIRED, .NOT_FOUND, .INVALID_FORMAT, .UNAVAILABLE { background: #7f2f2f; color: #ffe3e3; }
    code { background: #0c1227; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="wrap">${body}</div>
</body>
</html>`;
}

function renderPortalHome() {
  if (HOST_ROLE === 'api') {
    return renderLayout({
      title: 'QR-V™ API Surface',
      body: `
      <section class="card">
        <h1>QR-V™ API Surface</h1>
        <p class="muted">This deployment is API-only. Use issuer.qrv.network for issuer UI and verify.qrv.network for public verification.</p>
        <div class="links">
          <a href="/healthz">/healthz</a>
          <a href="/readyz">/readyz</a>
          <a href="/version">/version</a>
          <a href="/api/v1/verify/QRV-PROD-CERT-000001">/api/v1/verify/:qrvid</a>
        </div>
      </section>`
    });
  }

  if (HOST_ROLE === 'issuer') {
    return null;
  }

  return renderLayout({
    title: 'QR-V™ Public Verification',
    body: `
    <section class="card">
      <h1>QRV Public Verification</h1>
      <p class="muted">Authenticate certificates, credentials, products, and registry-backed records</p>
      <form class="row" action="/verify" method="get" onsubmit="event.preventDefault();const v=document.getElementById('qrvid').value.trim();if(v){window.location='/' + encodeURIComponent(v);}">
        <input id="qrvid" name="qrvid" type="text" required placeholder="Enter QRVID (for example: QRV-PROD-CERT-000001)" />
        <button type="submit">Verify QRVID</button>
      </form>
      <p><a class="btn" href="/QRV-PROD-CERT-000001">Try demo: QRV-PROD-CERT-000001</a></p>
      <div class="links">
        <a href="/healthz">/healthz</a>
        <a href="/version">/version</a>
      </div>
    </section>`
  });
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), environment: NODE_ENV });
});

app.get('/version', (_req, res) => {
  res.json({ version: VERSION, service: 'qrv-verify', environment: NODE_ENV });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), environment: NODE_ENV });
});

app.get('/readyz', async (_req, res) => {
  const issues = [...getConfigIssues()];

  if (IS_PRODUCTION && memoryRecords.size > 0) {
    issues.push('Mock/in-memory records detected in production runtime');
  }

  if (issues.length > 0) {
    return res.status(503).json({ ready: false, database: 'unknown', issues });
  }

  try {
    await pool.query('SELECT 1');
    return res.json({ ready: true, database: 'ok', issues: [] });
  } catch (error) {
    return res.status(503).json({ ready: false, database: 'unavailable', issues: [error.message] });
  }
});

app.get('/ready', async (_req, res) => {
  const issues = [...getConfigIssues()];

  if (IS_PRODUCTION && memoryRecords.size > 0) {
    issues.push('Mock/in-memory records detected in production runtime');
  }

  if (issues.length > 0) {
    return res.status(503).json({ ready: false, database: 'unknown', issues });
  }

  try {
    await pool.query('SELECT 1');
    return res.json({ ready: true, database: 'ok', issues: [] });
  } catch (error) {
    return res.status(503).json({ ready: false, database: 'unavailable', issues: [error.message] });
  }
});

app.get('/metrics', adminAuth, (_req, res) => {
  res.type('text/plain').send(
    [
      `requests_total ${metrics.requestsTotal}`,
      ...Object.entries(metrics.routes).map(([key, count]) => `route_hits{route="${key}"} ${count}`)
    ].join('\n')
  );
});

async function createRegistryRecord(req, res) {
  let qrvid = `QRV-PROD-CERT-${String(Date.now()).slice(-6)}`;
  try {
    const sequenceResult = await pool.query(`SELECT nextval('registry_qrvid_seq') AS seq`);
    const seq = Number(sequenceResult.rows[0]?.seq || 1);
    qrvid = `QRV-PROD-CERT-${String(seq).padStart(6, '0')}`;
  } catch (_error) {
    if (IS_PRODUCTION) {
      return sendError(res, 503, 'DB_UNAVAILABLE', 'Database unavailable for QRVID generation');
    }
  }

  const record = {
    qrvid,
    title: req.body.title || 'Untitled Record',
    subject: req.body.subject || 'Unknown',
    issuer: req.body.issuer || 'Unknown',
    status: 'active',
    certificate_version: 1,
    created_at: new Date().toISOString(),
    revoked_at: null
  };

  try {
    await pool.query(
      `INSERT INTO registry_records(qrvid, title, subject, issuer, status, certificate_version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [record.qrvid, record.title, record.subject, record.issuer, record.status, record.certificate_version]
    );
  } catch (error) {
    if (IS_PRODUCTION) {
      return sendError(res, 503, 'DB_UNAVAILABLE', 'Database unavailable for create');
    }
    memoryRecords.set(qrvid, record);
  }

  const verifyUrl = `${APP_BASE_URL}/registry/${qrvid}`;
  const qrCode = await QRCode.toDataURL(verifyUrl);
  await auditLog('registry_create', { qrvid, issuer: record.issuer });

  return res.status(201).json({ record, verifyUrl, qrCode });
}

async function getRegistryRecord(req, res, qrvid) {
  if (!QRVID_FORMAT.test(qrvid)) {
    return sendError(res, 400, 'INVALID_FORMAT', 'QRVID format is invalid');
  }

  try {
    const record = await readRecordById(qrvid);
    if (!record) {
      return sendError(res, 404, 'NOT_FOUND', 'Record not found');
    }

    return res.json({
      qrvid: record.qrvid,
      status: record.status,
      title: record.title,
      subject: record.subject,
      issuer: record.issuer,
      certificateVersion: record.certificate_version || 1
    });
  } catch (error) {
    return sendError(res, 500, 'INTERNAL_ERROR', 'Unable to fetch record');
  }
}

async function getVerificationState(qrvid) {
  if (!QRVID_FORMAT.test(qrvid)) {
    return { state: 'INVALID_FORMAT', message: 'QRVID format is invalid' };
  }

  try {
    const record = await readRecordById(qrvid);
    if (!record) {
      return { state: 'NOT_FOUND', message: 'No registry record was found for this QRVID.' };
    }

    const status = String(record.status || '').toLowerCase();
    if (status === 'revoked') {
      return { state: 'REVOKED', message: 'This record has been revoked by the issuer.', record };
    }
    if (status === 'expired') {
      return { state: 'EXPIRED', message: 'This record has expired and is no longer valid.', record };
    }

    return { state: 'VERIFIED', message: 'This record is valid and currently active.', record };
  } catch (_error) {
    return { state: 'UNAVAILABLE', message: 'Verification service is temporarily unavailable.' };
  }
}

async function resolveVerification(qrvidRaw) {
  const qrvid = normalizeQrvid(qrvidRaw);
  const verifiedAt = new Date().toISOString();
  const payload = await getVerificationState(qrvid);
  const statusCodeByState = {
    VERIFIED: 200,
    REVOKED: 200,
    EXPIRED: 200,
    INVALID_FORMAT: 400,
    NOT_FOUND: 404,
    UNAVAILABLE: 503
  };

  return {
    qrvid,
    payload,
    body: {
      qrvid,
      status: payload.state,
      message: payload.message,
      verifiedAt
    },
    statusCode: statusCodeByState[payload.state] || 500
  };
}

function renderVerificationPage(qrvid, payload) {
  const { state, message, record } = payload;
  const metadata = record
    ? `<ul>
        <li><strong>Title:</strong> ${escapeHtml(record.title || 'N/A')}</li>
        <li><strong>Subject:</strong> ${escapeHtml(record.subject || 'N/A')}</li>
        <li><strong>Issuer:</strong> ${escapeHtml(record.issuer || 'N/A')}</li>
      </ul>`
    : '<p class="muted">No additional record metadata available.</p>';

  return renderLayout({
    title: `QR-V Verify • ${state} • ${qrvid}`,
    body: `
      <section class="card">
        <h1>QR-V™ Verification Result</h1>
        <p><span class="status ${state}">${state}</span></p>
        <p>${escapeHtml(message)}</p>
        <p><strong>QRVID:</strong> <code>${escapeHtml(qrvid)}</code></p>
        ${metadata}
        <p class="links"><a href="/">Back to portal</a> <a href="/verify/${encodeURIComponent(qrvid)}">Canonical verify URL</a></p>
      </section>
    `
  });
}

async function revokeRegistryRecord(req, res, qrvid) {
  if (!QRVID_FORMAT.test(qrvid)) {
    return sendError(res, 400, 'INVALID_FORMAT', 'QRVID format is invalid');
  }

  try {
    let recordFound = false;
    try {
      const updateResult = await pool.query(
        `UPDATE registry_records
         SET status = 'revoked', revoked_at = NOW()
         WHERE qrvid = $1
         RETURNING *`,
        [qrvid]
      );
      recordFound = Boolean(updateResult.rows[0]);
    } catch (_error) {
      if (IS_PRODUCTION) {
        return sendError(res, 503, 'DB_UNAVAILABLE', 'Database unavailable for revoke');
      }
    }

    if (!recordFound) {
      if (IS_PRODUCTION) {
        assertNoProdMemoryFallback();
      }

      const memoryRecord = memoryRecords.get(qrvid);
      if (!memoryRecord) {
        return sendError(res, 404, 'NOT_FOUND', 'Record not found');
      }
      memoryRecord.status = 'revoked';
      memoryRecord.revoked_at = new Date().toISOString();
      memoryRecords.set(qrvid, memoryRecord);
    }

    await auditLog('registry_revoke', { qrvid });
    return res.json({ success: true, qrvid, status: 'revoked' });
  } catch (error) {
    return sendError(res, 500, 'INTERNAL_ERROR', 'Unable to revoke record');
  }
}

app.post('/registry/create', issuerAuth, createRegistryRecord);
app.post('/api/v1/registry/create', issuerTokenOrJwtAuth, createRegistryRecord);

app.get('/registry/:qrvid', async (req, res) => {
  return getRegistryRecord(req, res, req.params.qrvid);
});

app.post('/registry/:qrvid/revoke', issuerTokenOrJwtAuth, async (req, res) => {
  return revokeRegistryRecord(req, res, req.params.qrvid);
});

// Preserve legacy working routes
app.post('/records', issuerAuth, async (req, res) => {
  return createRegistryRecord(req, res);
});

app.get('/records/:id', async (req, res) => {
  return getRegistryRecord(req, res, req.params.id);
});

app.get('/verify/:id', rateLimit, async (req, res) => {
  const { qrvid, payload, statusCode } = await resolveVerification(req.params.id);
  return res.status(statusCode).type('html').send(renderVerificationPage(qrvid, payload));
});

app.get('/api/v1/verify/:qrvid', rateLimit, async (req, res) => {
  const { body, statusCode } = await resolveVerification(req.params.qrvid);
  return res.status(statusCode).json(body);
});

app.get('/v/:qrvid', rateLimit, async (req, res) => {
  const { qrvid, payload, statusCode } = await resolveVerification(req.params.qrvid);
  return res.status(statusCode).type('html').send(renderVerificationPage(qrvid, payload));
});

app.post('/api/v1/revoke', issuerTokenOrJwtAuth, async (req, res) => {
  const qrvid = normalizeQrvid(req.body?.qrvid || '');
  if (!qrvid) {
    return sendError(res, 400, 'INVALID_FORMAT', 'qrvid is required');
  }
  return revokeRegistryRecord(req, res, qrvid);
});

app.get('/', (_req, res) => {
  if (HOST_ROLE === 'issuer') {
    return res.redirect(302, ISSUER_LOGIN_PATH);
  }
  res.type('html').send(renderPortalHome());
});

app.get('/:qrvid', rateLimit, async (req, res, next) => {
  const staticRoutes = new Set(['healthz', 'readyz', 'ready', 'health', 'version', 'registry', 'records', 'verify', 'metrics']);
  if (staticRoutes.has(req.params.qrvid)) {
    return next();
  }
  if (!String(req.params.qrvid).toUpperCase().startsWith('QRV-')) {
    return next();
  }

  const { qrvid, payload, statusCode } = await resolveVerification(req.params.qrvid);
  return res.status(statusCode).type('html').send(renderVerificationPage(qrvid, payload));
});

app.use((error, _req, res, _next) => {
  if (!IS_PRODUCTION) {
    return sendError(res, 500, 'INTERNAL_ERROR', error.message || 'Unhandled server error');
  }
  return sendError(res, 500, 'INTERNAL_ERROR', 'Unhandled server error');
});

app.use((req, res) => {
  res.status(404).type('html').send(
    renderLayout({
      title: 'QR-V™ Verification Portal • Not Found',
      body: `
      <section class="card">
        <h1>QR-V™ Verification Portal</h1>
        <p><span class="status NOT_FOUND">NOT_FOUND</span></p>
        <p>The route <code>${escapeHtml(req.path)}</code> does not exist.</p>
        <p><a class="btn" href="/">Go to portal home</a></p>
      </section>`
    })
  );
});

async function runProductionSmokeCheck() {
  const checks = [
    pool.query('SELECT 1'),
    pool.query('SELECT NOW()'),
    pool.query('SELECT COUNT(*)::int FROM registry_records')
  ];
  await Promise.all(checks);
  console.log('[smoke] production smoke check passed');
}

async function start() {
  if (IS_PRODUCTION && !DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production');
  }
  if (!VALID_HOST_ROLES.has(HOST_ROLE)) {
    throw new Error(`Invalid HOST_ROLE '${HOST_ROLE}'. Allowed values: issuer, verify, api`);
  }

  await migrateCertificateV1();

  if (process.env.RUN_SMOKE_CHECK === '1') {
    await runProductionSmokeCheck();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QR-V server running on 0.0.0.0:${PORT} role=${HOST_ROLE}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Startup failed:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
  migrateCertificateV1,
  runProductionSmokeCheck,
  getConfigIssues,
  normalizeQrvid,
  resolveVerification
};
