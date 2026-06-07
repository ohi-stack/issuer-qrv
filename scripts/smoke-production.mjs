#!/usr/bin/env node

const checks = [
  {
    name: 'qrv.network root command hub',
    url: process.env.QRV_ROOT_URL || 'https://qrv.network',
    expectStatus: [200],
    expectContentTypePrefix: 'text/html',
  },
  {
    name: 'qrv.network status page',
    url: process.env.QRV_STATUS_PAGE_URL || 'https://qrv.network/status',
    expectStatus: [200],
    expectContentTypePrefix: 'text/html',
  },
  {
    name: 'api.qrv.network healthz',
    url: process.env.QRV_API_HEALTHZ_URL || 'https://api.qrv.network/healthz',
    expectStatus: [200],
    expectContentTypePrefix: 'application/json',
  },
  {
    name: 'verify demo QRVID',
    url: process.env.QRV_VERIFY_DEMO_URL || 'https://verify.qrv.network/QRV-DEMO-001',
    expectStatus: [200],
    expectContentTypePrefix: 'text/html',
  },
  {
    name: 'issuer login',
    url: process.env.QRV_ISSUER_LOGIN_URL || 'https://issuer.qrv.network/login',
    expectStatus: [200],
    expectContentTypePrefix: 'text/html',
  },
];

async function runCheck(check) {
  const response = await fetch(check.url, { method: 'GET' });
  const contentType = response.headers.get('content-type') || '';
  const passed = check.expectStatus.includes(response.status) && contentType.toLowerCase().startsWith(check.expectContentTypePrefix);

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
      console.log(`PASS ${result.name}: ${result.status} ${result.contentType} ${result.url}`);
      continue;
    }

    failures += 1;
    console.error(
      `FAIL ${result.name}: status=${result.status} content-type="${result.contentType}" expected-status=${result.expectStatus.join('|')} expected-prefix="${result.expectContentTypePrefix}" url=${result.url}${
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
