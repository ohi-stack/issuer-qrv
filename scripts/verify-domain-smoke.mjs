#!/usr/bin/env node

const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || 'https://verify.qrv.network';
const SEEDED_QRVID = process.env.SEEDED_QRVID || 'QRV-PROD-CERT-000001';
const UNKNOWN_QRVID = process.env.UNKNOWN_QRVID || `QRV-UNKNOWN-${Date.now()}`;

async function expectHtml(pathname, requiredText) {
  const url = `${VERIFY_BASE_URL}${pathname}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error(`GET ${url} returned non-HTML content-type '${contentType}'`);
  }

  const html = await response.text();
  if (html.trim().toLowerCase() === 'not found') {
    throw new Error(`GET ${url} returned plain text 'Not found' instead of HTML`);
  }

  if (!html.includes(requiredText)) {
    throw new Error(`GET ${url} HTML did not include expected text '${requiredText}'`);
  }

  return { url, status: response.status, contentType };
}

async function expectJson(pathname, expectedStatus) {
  const url = `${VERIFY_BASE_URL}${pathname}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok && response.status !== 404 && response.status !== 400) {
    throw new Error(`GET ${url} failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`GET ${url} returned non-JSON content-type '${contentType}'`);
  }

  const body = await response.json();
  if (body.status !== expectedStatus) {
    throw new Error(`GET ${url} expected status '${expectedStatus}' and received '${body.status}'`);
  }

  return { url, status: response.status, body };
}

async function run() {
  const root = await expectHtml('/', 'QRV Public Verification');
  const seeded = await expectHtml(`/${encodeURIComponent(SEEDED_QRVID)}`, 'VERIFIED');
  const unknown = await expectHtml(`/${encodeURIComponent(UNKNOWN_QRVID)}`, 'NOT_FOUND');
  const seededJson = await expectJson(`/api/v1/verify/${encodeURIComponent(SEEDED_QRVID)}`, 'VERIFIED');
  const unknownJson = await expectJson(`/api/v1/verify/${encodeURIComponent(UNKNOWN_QRVID)}`, 'NOT_FOUND');
  const invalidJson = await expectJson('/api/v1/verify/%20bad%20id%20', 'INVALID_FORMAT');

  console.log('Verify-domain smoke checks passed');
  console.log(
    JSON.stringify(
      {
        verifyBaseUrl: VERIFY_BASE_URL,
        seededQrvid: SEEDED_QRVID,
        unknownQrvid: UNKNOWN_QRVID,
        checks: { root, seeded, unknown, seededJson, unknownJson, invalidJson },
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error('Verify-domain smoke checks failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
