import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const baseDir = process.env.QRV_REPO_BASE || '/workspace';
const contractUrls = {
  QRV_API_BASE_URL: 'https://api.qrv.network',
  QRV_VERIFY_BASE_URL: 'https://verify.qrv.network',
  QRV_REGISTRY_BASE_URL: 'https://registry.qrv.network',
  CORS_ALLOWED_ORIGINS: 'https://issuer.qrv.network,https://verify.qrv.network,https://qrv.network'
};

const orderedRepos = [
  { name: 'qrv-api', checks: ['health', 'ping', 'version', 'create', 'verify', 'revoke', 'audit', 'status'] },
  { name: 'qrv-verify', checks: ['public-route', 'api-fetch', 'trust-page'] },
  { name: 'qrv-registry', checks: ['read-only', 'schema-docs'] },
  { name: 'qrv-status', checks: ['uptime-checks', '429-classification'] },
  { name: 'qrv-infra', checks: ['infra-docs'] },
  { name: 'qrv-security', checks: ['security-docs'] }
];

const now = new Date().toISOString();
console.log(`QR-V production contract sync started at ${now}`);
console.log(`Repo base: ${baseDir}`);
console.log('Canonical production URLs:');
for (const [k, v] of Object.entries(contractUrls)) {
  console.log(`- ${k}=${v}`);
}

const blockers = [];

function runCmd(cwd, cmd, args) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  return res.status ?? 1;
}

for (const repo of orderedRepos) {
  const repoPath = path.join(baseDir, repo.name);
  if (!fs.existsSync(repoPath)) {
    blockers.push(`${repo.name}: missing at ${repoPath}`);
    console.log(`\n[BLOCKED] ${repo.name} not present at ${repoPath}`);
    continue;
  }

  console.log(`\n=== ${repo.name} ===`);
  const envExample = path.join(repoPath, '.env.example');
  if (!fs.existsSync(envExample)) {
    blockers.push(`${repo.name}: .env.example missing`);
    console.log(`[BLOCKED] ${repo.name} missing .env.example`);
    continue;
  }

  const body = fs.readFileSync(envExample, 'utf8');
  const missingKeys = Object.keys(contractUrls).filter((k) => !body.includes(`${k}=`));
  if (missingKeys.length) {
    blockers.push(`${repo.name}: missing env keys (${missingKeys.join(', ')})`);
    console.log(`[BLOCKED] ${repo.name} missing env keys: ${missingKeys.join(', ')}`);
  } else {
    console.log(`[OK] ${repo.name} has canonical env keys in .env.example`);
  }

  const packageJsonPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`[WARN] ${repo.name} has no package.json, skipping npm validation`);
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = pkg.scripts || {};

  const installStatus = runCmd(repoPath, 'npm', ['install']);
  if (installStatus !== 0) {
    blockers.push(`${repo.name}: npm install failed`);
    continue;
  }

  for (const scriptName of ['check', 'test', 'build']) {
    if (!scripts[scriptName]) {
      console.log(`[WARN] ${repo.name} missing npm script: ${scriptName}`);
      continue;
    }
    const status = runCmd(repoPath, 'npm', ['run', scriptName]);
    if (status !== 0) {
      blockers.push(`${repo.name}: npm run ${scriptName} failed`);
      break;
    }
  }
}

console.log('\n=== Sync Summary ===');
if (!blockers.length) {
  console.log('All repos passed synchronization checks.');
} else {
  console.log('Blockers:');
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
  process.exitCode = 1;
}
