const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_API_KEY;
const ISSUER_TOKEN = process.env.ISSUER_TOKEN || process.env.ISSUER_API_KEY_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || process.env.ISSUER_JWT_SECRET;
const SIGNING_SECRET = process.env.SIGNING_SECRET || process.env.QRV_SIGNING_SECRET;

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://issuer.qrv.network';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 100);

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
  return issues;
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

const app = express();
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
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  return next();
}

app.use(rateLimit);

function authByToken(expectedToken) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  };
}

const adminAuth = authByToken(ADMIN_TOKEN);
const issuerAuth = authByToken(ISSUER_TOKEN);

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
      CREATE TABLE IF NOT EXISTS registry_records (
        qrvid uuid PRIMARY KEY,
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
  } catch (error) {
    if (IS_PRODUCTION) {
      throw new Error(`[db] migration failed in production: ${error.message}`);
    }
    console.warn('[db] migration skipped, falling back to in-memory mode');
  }
}

async function readRecordById(qrvid) {
  try {
    const result = await pool.query('SELECT * FROM registry_records WHERE qrvid = $1', [qrvid]);
    return result.rows[0] || memoryRecords.get(qrvid);
  } catch (error) {
    if (IS_PRODUCTION) {
      throw new Error(`[db] read failed in production: ${error.message}`);
    }
    return memoryRecords.get(qrvid);
  }
}

app.get('/', (_req, res) => {
  res.send('QR-V Issuer Portal Running');
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), environment: NODE_ENV });
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
  const qrvid = uuidv4();
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
      return res.status(503).json({ error: `Database unavailable for create: ${error.message}` });
    }
    memoryRecords.set(qrvid, record);
  }

  const verifyUrl = `${APP_BASE_URL}/registry/${qrvid}`;
  const qrCode = await QRCode.toDataURL(verifyUrl);
  await auditLog('registry_create', { qrvid, issuer: record.issuer });

  return res.status(201).json({ record, verifyUrl, qrCode });
}

async function getRegistryRecord(req, res, qrvid) {
  try {
    const record = await readRecordById(qrvid);
    if (!record) {
      return res.status(404).json({ status: 'invalid', message: 'Record not found' });
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
    return res.status(500).json({ error: error.message });
  }
}

async function revokeRegistryRecord(req, res, qrvid) {
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
        return res.status(503).json({ error: 'Database unavailable for revoke' });
      }
    }

    if (!recordFound) {
      if (IS_PRODUCTION) {
        assertNoProdMemoryFallback();
      }

      const memoryRecord = memoryRecords.get(qrvid);
      if (!memoryRecord) {
        return res.status(404).json({ error: 'Record not found' });
      }
      memoryRecord.status = 'revoked';
      memoryRecord.revoked_at = new Date().toISOString();
      memoryRecords.set(qrvid, memoryRecord);
    }

    await auditLog('registry_revoke', { qrvid });
    return res.json({ success: true, qrvid, status: 'revoked' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

app.post('/registry/create', issuerAuth, createRegistryRecord);

app.get('/registry/:qrvid', async (req, res) => {
  return getRegistryRecord(req, res, req.params.qrvid);
});

app.post('/registry/:qrvid/revoke', adminAuth, async (req, res) => {
  return revokeRegistryRecord(req, res, req.params.qrvid);
});

// Preserve legacy working routes
app.post('/records', issuerAuth, async (req, res) => {
  return createRegistryRecord(req, res);
});

app.get('/records/:id', async (req, res) => {
  return getRegistryRecord(req, res, req.params.id);
});

app.get('/verify/:id', async (req, res) => {
  return getRegistryRecord(req, res, req.params.id);
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
  await migrateCertificateV1();

  if (process.env.RUN_SMOKE_CHECK === '1') {
    await runProductionSmokeCheck();
  }

  app.listen(PORT, () => {
    console.log(`QR-V server running on ${PORT}`);
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
  getConfigIssues
};
