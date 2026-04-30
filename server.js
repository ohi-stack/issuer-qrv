require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';

app.disable('x-powered-by');

// Minimal guaranteed liveness route first.
app.get('/ping', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Remaining middleware/routes are initialized defensively so boot does not fail hard.
try {
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
} catch (startupError) {
  console.error('Non-fatal startup initialization error:', startupError);
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 && isProduction ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
});

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`VERIFY running on ${PORT}`);
  });

  server.on('error', (error) => {
    console.error('Server startup error:', error);
  });
} catch (listenError) {
  console.error('Fatal listen error:', listenError);
  process.exitCode = 1;
}
