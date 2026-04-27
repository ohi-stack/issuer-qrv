const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';

app.disable('x-powered-by');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeQrvid(raw) {
  try {
    return decodeURIComponent(String(raw || '').trim()).toUpperCase().replace(/\s+/g, '');
  } catch (_error) {
    return '';
  }
}

function verifyPayload(qrvidRaw) {
  const qrvid = normalizeQrvid(qrvidRaw);

  if (!/^QRV-[A-Z0-9-]{3,127}$/.test(qrvid)) {
    return {
      qrvid,
      status: 'INVALID_FORMAT',
      message: 'QRVID format is invalid',
      verifiedAt: new Date().toISOString()
    };
  }

  return {
    qrvid,
    status: 'VERIFIED',
    message: 'QRVID accepted by verification service',
    verifiedAt: new Date().toISOString()
  };
}

function renderPage(result) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>qrv-verify</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; background: #0b1220; color: #e5e7eb; }
    .card { max-width: 48rem; padding: 1.25rem; border: 1px solid #334155; border-radius: 0.75rem; background: #111827; }
    a { color: #93c5fd; }
    code { background: #1f2937; padding: 0.1rem 0.3rem; border-radius: 0.3rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>qrv-verify</h1>
    <p><strong>Status:</strong> ${escapeHtml(result.status)}</p>
    <p><strong>QRVID:</strong> <code>${escapeHtml(result.qrvid || 'N/A')}</code></p>
    <p>${escapeHtml(result.message)}</p>
    <p><a href="/">Back home</a></p>
  </div>
</body>
</html>`;
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>qrv-verify</title></head><body style="font-family:Arial,sans-serif;margin:2rem">
<h1>qrv-verify</h1>
<ul>
  <li><a href="/healthz">/healthz</a></li>
  <li><a href="/readyz">/readyz</a></li>
  <li><a href="/version">/version</a></li>
  <li><a href="/api/v1/verify/QRV-DEMO-0001">/api/v1/verify/:qrvid</a></li>
  <li><a href="/verify/QRV-DEMO-0001">/verify/:qrvid</a></li>
  <li><a href="/QRV-DEMO-0001">/:qrvid</a></li>
</ul>
</body></html>`);
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  res.json({ ready: true });
});

app.get('/version', (_req, res) => {
  res.json({ service: 'qrv-verify', version: VERSION });
});

app.get('/api/v1/verify/:qrvid', (req, res) => {
  const result = verifyPayload(req.params.qrvid);
  const statusCode = result.status === 'VERIFIED' ? 200 : 400;
  res.status(statusCode).json(result);
});

app.get('/verify/:qrvid', (req, res) => {
  const result = verifyPayload(req.params.qrvid);
  const statusCode = result.status === 'VERIFIED' ? 200 : 400;
  res.status(statusCode).type('html').send(renderPage(result));
});

app.get('/:qrvid', (req, res, next) => {
  const reserved = new Set(['healthz', 'readyz', 'version', 'api', 'verify']);
  if (reserved.has(req.params.qrvid)) {
    return next();
  }

  const result = verifyPayload(req.params.qrvid);
  const statusCode = result.status === 'VERIFIED' ? 200 : 400;
  return res.status(statusCode).type('html').send(renderPage(result));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`qrv-verify listening on 0.0.0.0:${PORT}`);
});
