#!/usr/bin/env node

const checks = [
  {
    name: 'api backend root is not HTML UI',
    url: process.env.API_QRV_URL || 'https://api.qrv.network/',
    expectContentTypePrefix: 'application/json',
  },
  {
    name: 'issuer root serves issuer UI HTML',
    url: process.env.ISSUER_QRV_URL || 'https://issuer.qrv.network/',
    expectContentTypePrefix: 'text/html',
  },
  {
    name: 'verify root serves verify UI HTML',
    url: process.env.VERIFY_QRV_URL || 'https://verify.qrv.network/',
    expectContentTypePrefix: 'text/html',
  },
  {
    name: 'registry backend root is not HTML UI',
    url: process.env.REGISTRY_QRV_URL || 'https://registry.qrv.network/',
    expectContentTypePrefix: 'application/json',
  },
];

async function runCheck(check) {
  const response = await fetch(check.url, { method: 'GET', redirect: 'manual' });
  const contentType = response.headers.get('content-type') || '';
  const passed = contentType.toLowerCase().startsWith(check.expectContentTypePrefix);

  return {
    ...check,
    status: response.status,
    contentType,
    passed,
  };
}

async function main() {
  const results = [];

  for (const check of checks) {
    try {
      results.push(await runCheck(check));
    } catch (error) {
      results.push({
        ...check,
        passed: false,
        status: null,
        contentType: '',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let failures = 0;
  for (const result of results) {
    if (result.passed) {
      console.log(`PASS ${result.name}: ${result.status} ${result.contentType}`);
      continue;
    }

    failures += 1;
    console.error(
      `FAIL ${result.name}: status=${result.status} content-type="${result.contentType}" expected-prefix="${result.expectContentTypePrefix}"${
        result.error ? ` error=${result.error}` : ''
      }`,
    );
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
