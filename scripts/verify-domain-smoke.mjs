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

async function run() {
  const root = await expectHtml('/', 'QRV Public Verification');
  const seeded = await expectHtml(`/${encodeURIComponent(SEEDED_QRVID)}`, 'VERIFIED');
  const unknown = await expectHtml(`/${encodeURIComponent(UNKNOWN_QRVID)}`, 'NOT_FOUND');

  console.log('Verify-domain smoke checks passed');
  console.log(
    JSON.stringify(
      {
        verifyBaseUrl: VERIFY_BASE_URL,
        seededQrvid: SEEDED_QRVID,
        unknownQrvid: UNKNOWN_QRVID,
        checks: { root, seeded, unknown },
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
