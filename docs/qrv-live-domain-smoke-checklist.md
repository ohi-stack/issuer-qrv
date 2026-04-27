# QR-V™ Live Domain Smoke Checklist

## Required environment variables

Set the following before running production validation:

- `ISSUER_BASE_URL=https://issuer.qrv.network`
- `API_BASE_URL=https://api.qrv.network`
- `VERIFY_BASE_URL=https://verify.qrv.network`
- `SMOKE_API_KEY=<live smoke api key>`
- `SMOKE_JWT=<live smoke jwt>`
- `DATABASE_URL=<postgres connection string>`
- `SIGNING_SECRET=<signing secret>`
- `ISSUER_TOKEN=<issuer api key/token>`
- `JWT_SECRET=<issuer jwt signing secret>`
- `ADMIN_TOKEN=<admin token for protected operations>`

## Deployment order

1. Apply backend database migrations first.
2. Deploy API service (`api.qrv.network`) with production secrets.
3. Deploy verification UI (`verify.qrv.network`) pointing to the live API host.
4. Deploy issuer portal (`issuer.qrv.network`) with live API base URL.
5. Run production validation and smoke checks.

## DNS/domain assumptions

- `issuer.qrv.network` resolves to issuer portal deployment.
- `api.qrv.network` resolves to API deployment with `/healthz`, `/readyz`, `/certificates`, and revocation routes.
- `verify.qrv.network` resolves to the public verification UI with canonical lookup at `/verify/{qrvid}` and legacy compatibility at `/{qrvid}`.
- TLS is enabled for all three domains.

## Migration-first requirement

Production rollout is **migration first**. Do not deploy API instances that can receive traffic before `registry_records` and `registry_audit_log` migrations have completed.

## Smoke command

```bash
ISSUER_BASE_URL=https://issuer.qrv.network \
API_BASE_URL=https://api.qrv.network \
VERIFY_BASE_URL=https://verify.qrv.network \
SMOKE_API_KEY=*** \
SMOKE_JWT=*** \
npm run smoke:e2e
```

## Expected outputs

- `GET /healthz` returns HTTP 200.
- `GET /readyz` returns HTTP 200.
- Certificate creation succeeds and returns a `qrvid`.
- Verification resolves to `VERIFIED` immediately after issuance.
- Revocation succeeds.
- Verification resolves to `REVOKED` after revocation.
- Missing QRVID resolves to `NOT_FOUND`.
- Invalid QRVID format renders `INVALID_FORMAT` (public-safe error state).
- Upstream/API interruption renders `UNAVAILABLE` (public-safe error state).
- Seeded record `QRV-PROD-CERT-000001` resolves at `https://verify.qrv.network/verify/QRV-PROD-CERT-000001` with public status `VERIFIED`.
- Legacy path `https://verify.qrv.network/QRV-PROD-CERT-000001` redirects to canonical `/verify/QRV-PROD-CERT-000001`.

## Public smoke URLs

Run at least one manual browser pass against:

- `https://verify.qrv.network`
- `https://verify.qrv.network/scan`
- `https://verify.qrv.network/help`
- `https://verify.qrv.network/api-status`
- `https://verify.qrv.network/verify/QRV-TEST-001`
- `https://verify.qrv.network/QRV-TEST-001`

## Rollback criteria

Roll back immediately if any of the following occur:

- `/readyz` fails or reports missing env/config issues.
- Any verification response exposes a public status outside `VERIFIED`, `REVOKED`, `EXPIRED`, `NOT_FOUND`.
- Smoke issue/revoke flow fails.
- Seeded production record cannot resolve as `VERIFIED`.
