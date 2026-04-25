#!/usr/bin/env node

const ISSUER_BASE = process.env.QRV_ISSUER_BASE_URL || 'https://issuer.qrv.network';
const VERIFY_BASE = process.env.QRV_VERIFY_BASE_URL || 'https://verify.qrv.network';

const routes = ['/dashboard', '/onboarding', '/production-checklist', '/launch-demo'];

async function checkIssuerRoute(route) {
  const url = `${ISSUER_BASE}${route}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
  return { route, status: res.status };
}

async function checkVerify(qrvid, expected) {
  const url = `${VERIFY_BASE}/verify/${encodeURIComponent(qrvid)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
  const json = await res.json();
  if (json?.status !== expected) {
    throw new Error(`${url} expected ${expected} but got ${json?.status || 'unknown'}`);
  }
  return { qrvid, status: json.status };
}

async function run() {
  const routeChecks = [];
  for (const route of routes) routeChecks.push(await checkIssuerRoute(route));

  const verifyChecks = [];
  verifyChecks.push(await checkVerify('QRV-PROD-CERT-000001', 'VERIFIED'));
  verifyChecks.push(await checkVerify('QRV-PROD-CERT-000002', 'REVOKED'));

  console.log('External smoke checks passed');
  console.log(JSON.stringify({ issuerBase: ISSUER_BASE, verifyBase: VERIFY_BASE, routeChecks, verifyChecks }, null, 2));
}

run().catch((error) => {
  console.error('External smoke checks failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
