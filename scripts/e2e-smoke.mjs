#!/usr/bin/env node

const ISSUER_BASE_URL = process.env.ISSUER_BASE_URL || 'https://issuer.qrv.network';
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.qrv.network';
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || 'https://verify.qrv.network';
const SMOKE_API_KEY = process.env.SMOKE_API_KEY;
const SMOKE_JWT = process.env.SMOKE_JWT;

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(SMOKE_API_KEY ? { 'x-api-key': SMOKE_API_KEY } : {}),
    ...(SMOKE_JWT ? { Authorization: `Bearer ${SMOKE_JWT}` } : {})
  };
}

async function checkIssuer() {
  const res = await fetch(ISSUER_BASE_URL);
  if (!res.ok) {
    throw new Error(`GET ${ISSUER_BASE_URL} failed (${res.status})`);
  }
}

async function callApi(path, init = {}) {
  const method = init.method || 'GET';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init.headers || {}) }
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

function normalizePublicStatus(payload) {
  const allowed = ['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND'];
  const status = payload?.status;
  if (!allowed.includes(status)) {
    throw new Error(`Unexpected public status '${status}'. Allowed states: ${allowed.join(', ')}`);
  }
  return status;
}

async function verifyPublic(qrvid) {
  const verifyPath = `/verify/${encodeURIComponent(qrvid)}`;
  const res = await fetch(`${VERIFY_BASE_URL}${verifyPath}`);

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`GET ${VERIFY_BASE_URL}${verifyPath} failed (${res.status}): ${JSON.stringify(payload)}`);
  }

  return normalizePublicStatus(payload);
}

async function run() {
  if (!SMOKE_API_KEY || !SMOKE_JWT) {
    throw new Error('SMOKE_API_KEY and SMOKE_JWT are both required for production smoke runs.');
  }

  const runId = Date.now();
  await checkIssuer();
  await callApi('/healthz');
  await callApi('/readyz');

  const created = await callApi('/certificates', {
    method: 'POST',
    body: JSON.stringify({
      certificateTitle: 'QRV Live Domain Smoke Test',
      issueDate: new Date().toISOString(),
      recipientName: `Live Smoke ${runId}`,
      privacyLevel: 'PUBLIC'
    })
  });

  const qrvid = created?.qrvid;
  if (!qrvid) {
    throw new Error('Certificate create response is missing qrvid.');
  }

  const verifiedStatus = await verifyPublic(qrvid);
  if (verifiedStatus !== 'VERIFIED') {
    throw new Error(`Expected VERIFIED after create, got ${verifiedStatus}.`);
  }

  await callApi(`/certificates/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Launch-week smoke revoke' })
  });

  const revokedStatus = await verifyPublic(qrvid);
  if (revokedStatus !== 'REVOKED') {
    throw new Error(`Expected REVOKED after revoke, got ${revokedStatus}.`);
  }

  const missingQrvid = `MISSING-${runId}`;
  const missingStatus = await verifyPublic(missingQrvid);
  if (missingStatus !== 'NOT_FOUND') {
    throw new Error(`Expected NOT_FOUND for missing qrvid, got ${missingStatus}.`);
  }

  console.log('QR-V live-domain smoke passed');
  console.log(JSON.stringify({ ISSUER_BASE_URL, API_BASE_URL, VERIFY_BASE_URL, qrvid, verifiedStatus, revokedStatus, missingStatus }, null, 2));
}

run().catch((error) => {
  console.error('QR-V live-domain smoke failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
