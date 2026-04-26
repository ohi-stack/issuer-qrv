# verify.qrv.network deployment guide

This guide documents the **canonical production setup** now that the branded verification portal is merged to `main`.

## 1) Deploy source of truth

- Deploy **branch `main`** for `verify.qrv.network`.
- The public verify portal is served by the Node/Express service (`npm run start:server`).
- Do not deploy stale feature branches for production verify traffic.

## 2) Hostinger settings (production)

Use the following project settings:

- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start:server`
- Node runtime: `22.x`
- App binds to `0.0.0.0:${PORT}` (Hostinger compatible).

## 3) Required environment variables

```bash
NODE_ENV=production
DATABASE_URL=...
SIGNING_SECRET=...
ISSUER_TOKEN=...
JWT_SECRET=...
ADMIN_TOKEN=...
```

Optional:

```bash
APP_VERSION=v1.0.0-verification-portal
```

## 4) Post-deploy smoke tests

Validate these exact URLs after every redeploy:

1. `https://verify.qrv.network/`
2. `https://verify.qrv.network/healthz`
3. `https://verify.qrv.network/version`
4. `https://verify.qrv.network/QRV-PROD-CERT-000001`
5. `https://verify.qrv.network/verify/QRV-PROD-CERT-000001`
6. `https://verify.qrv.network/random-bad-route`

Expected outcomes:

- `/` contains `QR-V™ Verification Portal`.
- `/healthz` and `/version` return JSON.
- QRVID paths return branded HTML result pages (not plain `Not found` text).
- Unknown routes return branded 404 HTML.

## 5) Release operations after merge

After a production-ready PR merges to `main`:

1. Redeploy `main` on Hostinger.
2. Run smoke tests from section 4.
3. Tag release:

```bash
git checkout main
git pull
git tag v1.0.0-verification-portal
git push origin v1.0.0-verification-portal
```
