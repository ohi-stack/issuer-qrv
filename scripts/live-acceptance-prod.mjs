import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const qrvid = process.env.QRV_ACCEPTANCE_QRVID || 'QRV-PROD-CERT-000001';

const targets = {
  issuer: process.env.ISSUER_BASE_URL || 'https://issuer.qrv.network',
  api: process.env.API_BASE_URL || 'https://api.qrv.network',
  verify: process.env.VERIFY_BASE_URL || 'https://verify.qrv.network',
  registry: process.env.REGISTRY_BASE_URL || 'https://registry.qrv.network'
};

const checks = [
  ['issuer-health', `${targets.issuer}/health`],
  ['api-health', `${targets.api}/health`],
  ['api-ping', `${targets.api}/ping`],
  ['api-version', `${targets.api}/version`],
  ['registry-health', `${targets.registry}/health`],
  ['verify-health', `${targets.verify}/health`],
  ['verify-public-json', `${targets.verify}/api/v1/verify/${encodeURIComponent(qrvid)}`],
  ['verify-public-page', `${targets.verify}/${encodeURIComponent(qrvid)}`]
];

function curl(url) {
  const tmp = path.join(os.tmpdir(), `qrv-live-${Math.random().toString(36).slice(2)}.txt`);
  try {
    const meta = execFileSync('curl', ['-sS', '-m', '20', '-o', tmp, '-w', '%{http_code}|%{redirect_url}', url], { encoding: 'utf8' });
    const [codeRaw, redirectUrl = ''] = meta.trim().split('|');
    const status = Number(codeRaw || 0);
    const body = fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8') : '';
    return { status, body, location: redirectUrl };
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

function printResult(name, result) {
  const preview = result.body.replace(/\s+/g, ' ').slice(0, 160);
  console.log(`${name.padEnd(18)} status=${result.status}${result.location ? ` location=${result.location}` : ''} body="${preview}"`);
}

function main() {
  console.log('[live-acceptance] target qrvid:', qrvid);
  const failures = [];

  for (const [name, url] of checks) {
    try {
      const result = curl(url);
      printResult(name, result);

      const statusAllowed = name === 'verify-public-json' ? [200, 404] : [200];
      if (!statusAllowed.includes(result.status)) failures.push(`${name} expected ${statusAllowed.join(' or ')} but got ${result.status}`);
      if (name === 'verify-public-json' && result.status === 200 && !/VERIFIED|REVOKED|EXPIRED|NOT_FOUND/.test(result.body)) {
        failures.push(`${name} returned 200 without expected verification state`);
      }
    } catch (error) {
      console.log(`${name.padEnd(18)} error=${error instanceof Error ? error.message : String(error)}`);
      failures.push(`${name} request failed`);
    }
  }

  if (failures.length) {
    console.log('\n[live-acceptance] FAILURES');
    for (const msg of failures) console.log(`- ${msg}`);
    assert.fail(`Live acceptance failed with ${failures.length} failing checks.`);
  }

  console.log('\n[live-acceptance] All checks passed.');
}

main();
