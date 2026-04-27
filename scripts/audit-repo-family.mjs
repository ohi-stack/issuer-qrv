import fs from 'node:fs';
import path from 'node:path';

const baseDir = process.env.QRV_REPO_BASE || '/workspace';
const repos = ['issuer-qrv', 'qrv-api', 'qrv-registry', 'qrv-verify', 'qrv-demo-records', 'qrv-status', 'qrv-infra', 'qrv-security'];
const requiredEnvKeys = [
  'NEXT_PUBLIC_QRV_API_BASE_URL',
  'NEXT_PUBLIC_QRV_VERIFY_BASE_URL',
  'NEXT_PUBLIC_QRV_REGISTRY_BASE_URL',
  'VERIFY_BASE_URL',
  'CORS_ALLOWED_ORIGINS'
];

for (const repo of repos) {
  const repoPath = path.join(baseDir, repo);
  if (!fs.existsSync(repoPath)) {
    console.log(`${repo}: MISSING (not found at ${repoPath})`);
    continue;
  }

  const envExamplePath = path.join(repoPath, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    console.log(`${repo}: FOUND but .env.example is missing`);
    continue;
  }

  const envBody = fs.readFileSync(envExamplePath, 'utf8');
  const missing = requiredEnvKeys.filter((k) => !envBody.includes(`${k}=`));
  if (missing.length) {
    console.log(`${repo}: .env.example missing keys -> ${missing.join(', ')}`);
  } else {
    console.log(`${repo}: .env.example has required production URL keys`);
  }
}
