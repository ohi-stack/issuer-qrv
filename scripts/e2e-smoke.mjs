#!/usr/bin/env node

const API_BASE = process.env.QRV_API_BASE_URL || 'https://api.qrv.network';
const VERIFY_BASE = process.env.QRV_VERIFY_BASE_URL || 'https://verify.qrv.network';

function headers() {
  const token = process.env.QRV_SMOKE_API_TOKEN;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function call(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) }
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed (${res.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

function getPublicStatus(payload) {
  const status = payload?.status;
  const allowed = ['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND'];
  if (!allowed.includes(status)) {
    throw new Error(`Unexpected public status '${status}'. Expected one of ${allowed.join(', ')}.`);
  }
  return status;
}

async function verifyPublic(qrvid) {
  const verifyPath = `/verify/${encodeURIComponent(qrvid)}`;
  const res = await fetch(`${VERIFY_BASE}${verifyPath}`);
  if (!res.ok) {
    throw new Error(`GET ${VERIFY_BASE}${verifyPath} failed (${res.status})`);
  }

  const payload = await res.json();
  return getPublicStatus(payload);
}

async function run() {
  const runId = Date.now();
  const recipientName = `Smoke Test ${runId}`;

  const created = await call('/certificates', {
    method: 'POST',
    body: JSON.stringify({
      certificateTitle: 'QRV Integration Smoke Test',
      issueDate: new Date().toISOString(),
      recipientName,
      privacyLevel: 'PUBLIC'
    })
  });

  const qrvid = created?.qrvid;
  if (!qrvid) throw new Error('Certificate create response did not contain qrvid.');

  const verifiedStatus = await verifyPublic(qrvid);
  if (verifiedStatus !== 'VERIFIED') {
    throw new Error(`Expected VERIFIED immediately after issuance, got ${verifiedStatus}.`);
  }

  await call(`/certificates/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Smoke test cleanup' })
  });

  const revokedStatus = await verifyPublic(qrvid);
  if (revokedStatus !== 'REVOKED') {
    throw new Error(`Expected REVOKED after revocation, got ${revokedStatus}.`);
  }

  const missingStatus = await verifyPublic(`MISSING-${runId}`);
  if (missingStatus !== 'NOT_FOUND') {
    throw new Error(`Expected NOT_FOUND for missing certificate, got ${missingStatus}.`);
  }

  console.log('Smoke flow passed');
  console.log(JSON.stringify({ qrvid, verifiedStatus, revokedStatus, missingStatus }, null, 2));
}

run().catch((error) => {
  console.error('Smoke flow failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
