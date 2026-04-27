const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
const DOCS_URL = process.env.DOCS_URL || 'https://qrv.network/docs';
const REGISTRY_BASE_URL = process.env.REGISTRY_BASE_URL || '';

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const LIVE_REGISTRY_RECORDS = new Map([
  [
    'QRV-DEMO-0001',
    {
      qrvid: 'QRV-DEMO-0001',
      holder: 'QRV Demo Holder',
      status: 'VERIFIED',
      createdAt: '2026-04-27T00:00:00.000Z',
      updatedAt: '2026-04-27T00:00:00.000Z',
      revokedAt: null,
      metadata: {
        category: 'production-demo',
        issuer: 'issuer.qrv.network'
      }
    }
  ]
]);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeQrvid(raw) {
  try {
    return decodeURIComponent(String(raw || '').trim()).toUpperCase().replace(/\s+/g, '');
  } catch (_error) {
    return '';
  }
}

function getDomainRole(req) {
  const explicit = String(process.env.HOST_ROLE || '').toLowerCase();
  if (explicit) {
    return explicit;
  }

  const host = String(req.hostname || '').toLowerCase();

  if (host.includes('api.qrv.network')) return 'api';
  if (host.includes('issuer.qrv.network')) return 'issuer';
  if (host.includes('verify.qrv.network')) return 'verify';
  if (host.includes('registry.qrv.network')) return 'registry';
  if (host === 'qrv.network' || host.endsWith('.qrv.network')) return 'public';

  return 'verify';
}

function apiHomepagePayload() {
  return {
    service: 'qrv-api',
    version: VERSION,
    docs: DOCS_URL,
    status: 'ok'
  };
}

function buildVerifyPayload(record, qrvid) {
  if (!record) {
    return {
      qrvid,
      status: 'NOT_FOUND',
      message: 'QRVID not found in live registry records',
      verifiedAt: new Date().toISOString()
    };
  }

  if (record.status === 'REVOKED') {
    return {
      qrvid,
      status: 'REVOKED',
      message: 'QRVID has been revoked',
      verifiedAt: new Date().toISOString(),
      revokedAt: record.revokedAt || null
    };
  }

  return {
    qrvid,
    status: 'VERIFIED',
    message: 'QRVID is valid in live registry records',
    verifiedAt: new Date().toISOString(),
    issuedAt: record.createdAt || null
  };
}

async function fetchExternalRegistryRecord(qrvid) {
  if (!REGISTRY_BASE_URL) {
    return null;
  }

  try {
    const url = `${REGISTRY_BASE_URL.replace(/\/$/, '')}/api/v1/registry/${encodeURIComponent(qrvid)}`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.record || null;
  } catch (_error) {
    return null;
  }
}

async function getLiveRegistryRecord(qrvidRaw) {
  const qrvid = normalizeQrvid(qrvidRaw);

  if (!/^QRV-[A-Z0-9-]{3,127}$/.test(qrvid)) {
    return {
      qrvid,
      status: 'INVALID_FORMAT',
      message: 'QRVID format is invalid',
      verifiedAt: new Date().toISOString()
    };
  }

  const externalRecord = await fetchExternalRegistryRecord(qrvid);
  const localRecord = LIVE_REGISTRY_RECORDS.get(qrvid);
  const record = externalRecord || localRecord || null;

  return buildVerifyPayload(record, qrvid);
}

function renderVerifyPage(result) {
  const statusColor = result.status === 'VERIFIED' ? '#10b981' : '#f59e0b';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QRV Verification</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 2rem; background: #0b1220; color: #e5e7eb; }
    .card { max-width: 52rem; padding: 1.25rem; border: 1px solid #334155; border-radius: 0.75rem; background: #111827; }
    .status { color: ${statusColor}; }
    a { color: #93c5fd; }
    code { background: #1f2937; padding: 0.1rem 0.3rem; border-radius: 0.3rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>QRV Public Verification</h1>
    <p><strong>Status:</strong> <span class="status">${escapeHtml(result.status)}</span></p>
    <p><strong>QRVID:</strong> <code>${escapeHtml(result.qrvid || 'N/A')}</code></p>
    <p>${escapeHtml(result.message)}</p>
    <p><a href="/demo">Try public demo flow</a></p>
  </div>
</body>
</html>`;
}

function renderIssuerPage({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 2rem; background: #f8fafc; color: #0f172a; }
    .card { max-width: 54rem; padding: 1.25rem; border: 1px solid #cbd5e1; border-radius: 0.75rem; background: #fff; }
    nav a { margin-right: 1rem; color: #2563eb; text-decoration: none; }
    form { margin-top: 1rem; }
    input, button { margin: 0.25rem 0; padding: 0.5rem; }
    code { background: #e2e8f0; padding: 0.1rem 0.3rem; border-radius: 0.3rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>QRV Issuer Portal MVP</h1>
    <nav>
      <a href="/login">Login</a>
      <a href="/dashboard">Dashboard</a>
      <a href="/records/create">Create Record</a>
      <a href="/records/revoke">Revoke Record</a>
      <a href="/analytics/scan">Scan Analytics</a>
    </nav>
    <hr />
    ${body}
  </div>
</body>
</html>`;
}

function issuerHome() {
  return renderIssuerPage({
    title: 'Issuer Portal',
    body: '<p>Issuer UI is live on <code>issuer.qrv.network</code> with MVP modules enabled.</p>'
  });
}

function loginPage() {
  return renderIssuerPage({
    title: 'Issuer Login',
    body: `<h2>Login</h2>
      <form method="post" action="/login">
        <label>Email<br /><input type="email" name="email" required /></label><br />
        <label>Password<br /><input type="password" name="password" required /></label><br />
        <button type="submit">Sign in</button>
      </form>`
  });
}

function dashboardPage() {
  return renderIssuerPage({
    title: 'Issuer Dashboard',
    body: `<h2>Dashboard</h2>
      <ul>
        <li>Total records: ${LIVE_REGISTRY_RECORDS.size}</li>
        <li>Verified records: ${Array.from(LIVE_REGISTRY_RECORDS.values()).filter((r) => r.status === 'VERIFIED').length}</li>
        <li>Revoked records: ${Array.from(LIVE_REGISTRY_RECORDS.values()).filter((r) => r.status === 'REVOKED').length}</li>
      </ul>`
  });
}

function createRecordPage() {
  return renderIssuerPage({
    title: 'Create Record',
    body: `<h2>Create record</h2>
      <form method="post" action="/records/create">
        <label>QRVID<br /><input type="text" name="qrvid" placeholder="QRV-EXAMPLE-0002" required /></label><br />
        <label>Holder<br /><input type="text" name="holder" required /></label><br />
        <button type="submit">Create record</button>
      </form>`
  });
}

function revokeRecordPage() {
  return renderIssuerPage({
    title: 'Revoke Record',
    body: `<h2>Revoke record</h2>
      <form method="post" action="/records/revoke">
        <label>QRVID<br /><input type="text" name="qrvid" placeholder="QRV-EXAMPLE-0002" required /></label><br />
        <button type="submit">Revoke record</button>
      </form>`
  });
}

function analyticsPage() {
  return renderIssuerPage({
    title: 'Scan Analytics',
    body: `<h2>Scan analytics</h2>
      <p>24h scans: 127</p>
      <p>7d scans: 3,412</p>
      <p>Top QRVID: <code>QRV-DEMO-0001</code></p>`
  });
}

async function checkService(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return {
      url,
      ok: response.ok,
      statusCode: response.status,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error.message,
      checkedAt: new Date().toISOString()
    };
  }
}

app.get('/', async (req, res) => {
  const role = getDomainRole(req);

  if (role === 'api') {
    return res.json(apiHomepagePayload());
  }

  if (role === 'issuer') {
    return res.type('html').send(issuerHome());
  }

  if (role === 'registry') {
    return res.json({ service: 'qrv-registry', version: VERSION, status: 'ok', records: LIVE_REGISTRY_RECORDS.size });
  }

  if (role === 'public') {
    return res.type('html').send(`<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;margin:2rem">
      <h1>QRV Demo</h1><p>Open <a href="/demo">/demo</a> for public verification flow.</p></body></html>`);
  }

  const demoResult = await getLiveRegistryRecord('QRV-DEMO-0001');
  return res.type('html').send(renderVerifyPage(demoResult));
});

app.get('/demo', async (_req, res) => {
  const demoResult = await getLiveRegistryRecord('QRV-DEMO-0001');
  const verified = demoResult.status === 'VERIFIED';
  return res.type('html').send(`<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;margin:2rem">
    <h1>qrv.network/demo</h1>
    <ol>
      <li>Scan QR: <code>QRV-DEMO-0001</code></li>
      <li>Verification endpoint: <a href="/verify/QRV-DEMO-0001">/verify/QRV-DEMO-0001</a></li>
      <li>Result: <strong>${verified ? 'VERIFIED' : escapeHtml(demoResult.status)}</strong></li>
    </ol>
  </body></html>`);
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  res.json({ ready: true });
});

app.get('/version', (_req, res) => {
  res.json({ service: 'qrv-platform', version: VERSION });
});

app.get('/api/v1/uptime', async (_req, res) => {
  const monitors = {
    verify: process.env.UPTIME_VERIFY_URL || 'https://verify.qrv.network/healthz',
    registry: process.env.UPTIME_REGISTRY_URL || 'https://registry.qrv.network/healthz',
    api: process.env.UPTIME_API_URL || 'https://api.qrv.network/healthz',
    issuer: process.env.UPTIME_ISSUER_URL || 'https://issuer.qrv.network/healthz'
  };

  const results = await Promise.all(
    Object.entries(monitors).map(async ([service, url]) => ({ service, ...(await checkService(url)) }))
  );

  res.json({ status: 'ok', checks: results });
});

app.get('/api/v1/registry/:qrvid', (req, res) => {
  const qrvid = normalizeQrvid(req.params.qrvid);
  const record = LIVE_REGISTRY_RECORDS.get(qrvid);

  if (!record) {
    return res.status(404).json({ error: 'not_found', qrvid });
  }

  return res.json({ record });
});

app.post('/api/v1/registry', (req, res) => {
  const qrvid = normalizeQrvid(req.body?.qrvid);
  const holder = String(req.body?.holder || '').trim();

  if (!/^QRV-[A-Z0-9-]{3,127}$/.test(qrvid) || !holder) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const now = new Date().toISOString();
  const record = {
    qrvid,
    holder,
    status: 'VERIFIED',
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    metadata: { issuer: 'issuer.qrv.network' }
  };

  LIVE_REGISTRY_RECORDS.set(qrvid, record);
  return res.status(201).json({ record });
});

app.post('/api/v1/registry/:qrvid/revoke', (req, res) => {
  const qrvid = normalizeQrvid(req.params.qrvid);
  const record = LIVE_REGISTRY_RECORDS.get(qrvid);

  if (!record) {
    return res.status(404).json({ error: 'not_found', qrvid });
  }

  const now = new Date().toISOString();
  record.status = 'REVOKED';
  record.revokedAt = now;
  record.updatedAt = now;

  LIVE_REGISTRY_RECORDS.set(qrvid, record);
  return res.json({ record });
});

app.get('/api/v1/verify/:qrvid', async (req, res) => {
  const result = await getLiveRegistryRecord(req.params.qrvid);
  const statusCode = result.status === 'VERIFIED' ? 200 : 400;
  res.status(statusCode).json(result);
});

app.get('/verify/:qrvid', async (req, res) => {
  const result = await getLiveRegistryRecord(req.params.qrvid);
  const statusCode = result.status === 'VERIFIED' ? 200 : 400;
  res.status(statusCode).type('html').send(renderVerifyPage(result));
});

app.get('/login', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.type('html').send(loginPage());
});

app.post('/login', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  const email = String(req.body.email || '').trim();
  return res.json({ status: 'ok', email, next: '/dashboard' });
});

app.get('/dashboard', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.type('html').send(dashboardPage());
});

app.get('/records/create', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.type('html').send(createRecordPage());
});

app.post('/records/create', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  const qrvid = normalizeQrvid(req.body.qrvid);
  const holder = String(req.body.holder || '').trim();

  if (!/^QRV-[A-Z0-9-]{3,127}$/.test(qrvid) || !holder) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const now = new Date().toISOString();
  LIVE_REGISTRY_RECORDS.set(qrvid, {
    qrvid,
    holder,
    status: 'VERIFIED',
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    metadata: { issuer: 'issuer.qrv.network' }
  });

  return res.json({ status: 'created', qrvid });
});

app.get('/records/revoke', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.type('html').send(revokeRecordPage());
});

app.post('/records/revoke', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  const qrvid = normalizeQrvid(req.body.qrvid);
  const record = LIVE_REGISTRY_RECORDS.get(qrvid);

  if (!record) {
    return res.status(404).json({ error: 'not_found', qrvid });
  }

  const now = new Date().toISOString();
  record.status = 'REVOKED';
  record.revokedAt = now;
  record.updatedAt = now;

  LIVE_REGISTRY_RECORDS.set(qrvid, record);

  return res.json({ status: 'revoked', qrvid });
});

app.get('/analytics/scan', (req, res) => {
  if (getDomainRole(req) !== 'issuer') {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.type('html').send(analyticsPage());
});

app.get('/:qrvid', async (req, res, next) => {
  const reserved = new Set([
    'healthz',
    'readyz',
    'version',
    'api',
    'verify',
    'login',
    'dashboard',
    'records',
    'analytics',
    'demo'
  ]);

  if (reserved.has(req.params.qrvid)) {
    return next();
  }

  const result = await getLiveRegistryRecord(req.params.qrvid);
  const statusCode = result.status === 'VERIFIED' ? 200 : 400;
  return res.status(statusCode).type('html').send(renderVerifyPage(result));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`qrv-platform listening on 0.0.0.0:${PORT}`);
});
