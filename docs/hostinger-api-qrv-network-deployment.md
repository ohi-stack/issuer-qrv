# Deploy issuer-qrv to api.qrv.network

Purpose: run `ohi-stack/issuer-qrv` as the production API surface for `api.qrv.network` using `HOST_ROLE=api`.

## Deployment target

- Domain: `api.qrv.network`
- Repository: `ohi-stack/issuer-qrv`
- Runtime: Node.js 22.x
- Start command: `npm start`
- Entry point: `server.js`
- Required role: `HOST_ROLE=api`

## Required environment variables

Set these in the Hostinger Node.js application environment for `api.qrv.network`:

```env
NODE_ENV=production
PORT=3000
HOST_ROLE=api
APP_BASE_URL=https://api.qrv.network
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE
PGSSLMODE=require
SIGNING_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
ISSUER_TOKEN=REPLACE_WITH_ISSUER_BEARER_TOKEN
JWT_SECRET=REPLACE_WITH_JWT_SECRET
ADMIN_TOKEN=REPLACE_WITH_ADMIN_BEARER_TOKEN
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RUN_SMOKE_CHECK=1
```

## Hostinger settings

Use these settings in the Node.js app panel:

```text
Application root: issuer-qrv
Application startup file: server.js
Start command: npm start
Node version: 22.x
Public domain: api.qrv.network
```

If Hostinger asks for build command, use:

```text
npm install
```

This service is Express-backed and starts with `node server.js`; it does not require `next start` for the API role.

## Required production behavior

After deploy, the following must work:

```text
GET https://api.qrv.network/
GET https://api.qrv.network/healthz
GET https://api.qrv.network/readyz
GET https://api.qrv.network/version
GET https://api.qrv.network/api/v1/verify/QRV-PROD-CERT-000001
POST https://api.qrv.network/api/v1/registry/create
POST https://api.qrv.network/api/v1/revoke
```

## Smoke checks

Run after deploy:

```bash
curl -i https://api.qrv.network/healthz
curl -i https://api.qrv.network/readyz
curl -i https://api.qrv.network/version
curl -i https://api.qrv.network/api/v1/verify/QRV-PROD-CERT-000001
```

Expected minimum result:

- `/healthz` returns HTTP 200.
- `/readyz` returns HTTP 200 only when `DATABASE_URL`, `SIGNING_SECRET`, `ISSUER_TOKEN`, `JWT_SECRET`, `ADMIN_TOKEN`, and `HOST_ROLE=api` are configured.
- `/api/v1/verify/QRV-PROD-CERT-000001` returns structured JSON.

## Authenticated create test

```bash
curl -i -X POST https://api.qrv.network/api/v1/registry/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ISSUER_TOKEN" \
  -d '{
    "title":"QR-V Production Test Certificate",
    "subject":"Production Test Subject",
    "issuer":"QR-V Production Issuer"
  }'
```

Expected result:

```json
{
  "record": {
    "qrvid": "QRV-PROD-CERT-000002",
    "title": "QR-V Production Test Certificate",
    "subject": "Production Test Subject",
    "issuer": "QR-V Production Issuer",
    "status": "active"
  },
  "verifyUrl": "https://api.qrv.network/registry/QRV-PROD-CERT-000002",
  "qrCode": "data:image/png;base64,..."
}
```

## Notes

- `HOST_ROLE=api` causes the root route to show the API-only surface.
- Do not deploy `ohi-stack/qrv-api` to `api.qrv.network` yet; it is still a mock/incomplete gateway.
- Keep production write routes protected by `ISSUER_TOKEN` or valid issuer JWT.
- Keep `ADMIN_TOKEN` private and use it only for metrics/admin operations.
