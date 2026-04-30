require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function serviceStatusResponse(extra = {}) {
  return {
    status: 'ok',
    service: 'qrv-verify',
    version: VERSION,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

app.get('/', (_req, res) => {
  res.status(200).type('html').send(`<!doctype html><html><body><h1>QRV Verify</h1><p>Service is online.</p></body></html>`);
});

app.get('/ping', (_req, res) => res.status(200).json(serviceStatusResponse({ endpoint: 'ping' })));
app.get('/health', (_req, res) => res.status(200).json(serviceStatusResponse({ endpoint: 'health' })));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.status(200).json({ status: 'ready' }));
app.get('/version', (_req, res) => res.status(200).json({ version: VERSION }));

app.get('/QRV-DEMO-001', (_req, res) => {
  res.status(200).json({
    qrvid: 'QRV-DEMO-001',
    verified: true,
    issuer: 'issuer.qrv.network',
    message: 'Demo record resolved successfully.'
  });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 && isProduction ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
});

const server = app.listen(PORT, () => {
  console.log(`qrv-verify listening on :${PORT}`);
});

server.on('error', (error) => {
  console.error('Server startup error:', error);
  process.exitCode = 1;
});
