#!/usr/bin/env node

import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const DEFAULT_TIMEOUT_MS = Number(process.env.QRV_AUDIT_TIMEOUT_MS || 15_000);
const USER_AGENT = process.env.QRV_AUDIT_USER_AGENT || 'QRV-Live-Domain-Audit/1.0';

const checks = [
  {
    domain: 'qrv.network',
    role: 'Root QR-V node',
    expectedService: 'ohi-stack/qrv-node (Express, server.js)',
    url: process.env.QRV_AUDIT_ROOT_URL || 'https://qrv.network',
    expectedContentType: 'text/html',
    expectedKeyword: 'QR-V hub marker',
    validate: validateHubHtml,
  },
  {
    domain: 'qrv.network',
    role: 'Root QR-V status',
    expectedService: 'ohi-stack/qrv-node (Express, server.js)',
    url: process.env.QRV_AUDIT_ROOT_STATUS_URL || 'https://qrv.network/status',
    expectedContentType: 'text/html',
    expectedKeyword: 'Production Status',
    validate: validateHubStatus,
  },
  {
    domain: 'api.qrv.network',
    role: 'API health',
    expectedService: 'ohi-stack/qrv-api (Express, server.js)',
    url: process.env.QRV_AUDIT_API_HEALTHZ_URL || 'https://api.qrv.network/healthz',
    expectedContentType: 'application/json',
    expectedKeyword: 'health/status JSON marker',
    validate: validateApiHealthJson,
  },
  {
    domain: 'verify.qrv.network',
    role: 'Verification result',
    expectedService: 'ohi-stack/qrv-node (Express, server.js)',
    url: process.env.QRV_AUDIT_VERIFY_DEMO_URL || 'https://verify.qrv.network/QRV-DEMO-001',
    expectedContentType: 'text/html',
    expectedKeyword: 'QRV-DEMO-001 verification marker',
    validate: validateStyledVerificationResult,
  },
  {
    domain: 'issuer.qrv.network',
    role: 'Issuer login',
    expectedService: 'ohi-stack/issuer-qrv (Next.js)',
    url: process.env.QRV_AUDIT_ISSUER_LOGIN_URL || 'https://issuer.qrv.network/login',
    expectedContentType: 'text/html',
    expectedKeyword: 'issuer login marker',
    validate: validateIssuerLogin,
  },
  {
    domain: 'registry.qrv.network',
    role: 'Registry service',
    expectedService: 'ohi-stack/qrv-registry (Express, server.js)',
    url: process.env.QRV_AUDIT_REGISTRY_URL || 'https://registry.qrv.network',
    expectedContentType: 'text/html or application/json',
    expectedKeyword: 'registry/status marker',
    validate: validateRegistryStatus,
  },
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function hasHtmlContentType(contentType) {
  return normalize(contentType).includes('text/html');
}

function hasJsonContentType(contentType) {
  return normalize(contentType).includes('application/json') || normalize(contentType).includes('+json');
}

function requireStatus(response, allowedStatuses = [200]) {
  if (!allowedStatuses.includes(response.status)) {
    return `expected HTTP ${allowedStatuses.join(' or ')}, got ${response.status}`;
  }

  return null;
}

function requireAnyBodyMatch(body, patterns, label) {
  if (patterns.some((pattern) => pattern.test(body))) {
    return null;
  }

  return `expected body to include ${label}`;
}

function formatError(error) {
  if (!(error instanceof Error)) return String(error);

  const cause = error.cause;
  if (cause instanceof Error) {
    const code = typeof cause.code === 'string' ? cause.code : '';
    const message = cause.message || code;
    const suffix = [code, message].filter(Boolean).join(' ');
    return suffix ? `${error.message}: ${suffix}` : error.message;
  }

  return error.message;
}

function validateHubHtml({ response, contentType, body }) {
  return (
    requireStatus(response) ||
    (!hasHtmlContentType(contentType) ? `expected text/html content-type, got "${contentType || 'missing'}"` : null) ||
    requireAnyBodyMatch(body, [/QR-V/i, /QRV\.network/i, /command hub/i, /Network Directory/i], 'QRV hub markers')
  );
}

function validateHubStatus({ response, contentType, body }) {
  return (
    requireStatus(response) ||
    (!hasHtmlContentType(contentType) ? `expected text/html content-type, got "${contentType || 'missing'}"` : null) ||
    requireAnyBodyMatch(body, [/Production Status/i, /Status Links/i, /API Health/i, /Registry Authority/i], 'hub status markers')
  );
}

function validateApiHealthJson({ response, contentType, body }) {
  const baseError = requireStatus(response) || (!hasJsonContentType(contentType) ? `expected JSON content-type, got "${contentType || 'missing'}"` : null);
  if (baseError) return baseError;

  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      return requireAnyBodyMatch(JSON.stringify(parsed), [/ok/i, /healthy/i, /health/i, /status/i, /version/i], 'health JSON markers');
    }
  } catch (error) {
    return `expected valid JSON body (${error instanceof Error ? error.message : String(error)})`;
  }

  return 'expected JSON object body';
}

function validateRegistryStatus({ response, contentType, body }) {
  const statusError = requireStatus(response);
  if (statusError) return statusError;

  if (!hasHtmlContentType(contentType) && !hasJsonContentType(contentType)) {
    return `expected HTML or JSON content-type, got "${contentType || 'missing'}"`;
  }

  if (hasJsonContentType(contentType)) {
    try {
      JSON.parse(body);
    } catch (error) {
      return `expected valid JSON registry/status body (${error instanceof Error ? error.message : String(error)})`;
    }
  }

  return requireAnyBodyMatch(body, [/registry/i, /status/i, /ready/i, /health/i, /authority/i], 'registry/status markers');
}

function validateIssuerLogin({ response, contentType, body }) {
  return (
    requireStatus(response) ||
    (!hasHtmlContentType(contentType) ? `expected text/html content-type, got "${contentType || 'missing'}"` : null) ||
    requireAnyBodyMatch(body, [/issuer/i, /login/i, /sign in/i, /password/i], 'issuer login markers')
  );
}

function validateStyledVerificationResult({ response, contentType, body }) {
  return (
    requireStatus(response) ||
    (!hasHtmlContentType(contentType) ? `expected text/html content-type, got "${contentType || 'missing'}"` : null) ||
    requireAnyBodyMatch(body, [/Verification Result/i, /QRV-DEMO-001/i, /VERIFIED|REVOKED|EXPIRED|NOT_FOUND/i], 'verification result markers') ||
    requireAnyBodyMatch(body, [/style=/i, /class=/i, /stylesheet/i, /__next/i], 'styling markers')
  );
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${DEFAULT_TIMEOUT_MS}ms`)), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'User-Agent': USER_AGENT,
      },
    });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function runCheck(check) {
  const startedAt = Date.now();

  try {
    const { response, body } = await fetchWithTimeout(check.url);
    const contentType = response.headers.get('content-type') || '';
    const error = check.validate({ response, contentType, body });

    return {
      ...check,
      passed: !error,
      status: response.status,
      contentType,
      finalUrl: response.url,
      elapsedMs: Date.now() - startedAt,
      error,
    };
  } catch (error) {
    return {
      ...check,
      passed: false,
      status: null,
      contentType: '',
      finalUrl: check.url,
      elapsedMs: Date.now() - startedAt,
      error: formatError(error),
    };
  }
}

function printResult(result) {
  const state = result.passed ? 'PASS' : 'FAIL';
  const status = result.status === null ? 'NO_RESPONSE' : result.status;
  const actualContentType = result.contentType || 'missing';
  const expected = `expected content-type=${result.expectedContentType}; keyword=${result.expectedKeyword}`;
  const details = [
    state,
    result.domain,
    `[${result.role}]`,
    `service="${result.expectedService}"`,
    `status=${status}`,
    `elapsed=${result.elapsedMs}ms`,
    `content-type="${actualContentType}"`,
    expected,
    `url=${result.finalUrl}`,
  ].join(' ');

  if (result.passed) {
    console.log(details);
    return;
  }

  console.error(`${details} :: ${result.error}; requested=${result.url}`);
}

async function main() {
  console.log(`QRV live domain audit started at ${new Date().toISOString()}`);
  console.log(`Timeout per request: ${DEFAULT_TIMEOUT_MS}ms`);

  const results = [];
  for (const check of checks) {
    const result = await runCheck(check);
    results.push(result);
    printResult(result);
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  console.log(`Summary: ${passed}/${results.length} checks passed; ${failed} failed.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});
