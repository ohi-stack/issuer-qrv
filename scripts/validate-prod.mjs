#!/usr/bin/env node

const required = [
  'DATABASE_URL',
  'SIGNING_SECRET',
  'ISSUER_TOKEN',
  'JWT_SECRET',
  'ADMIN_TOKEN'
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required production env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Production env validation passed.');
