# QR-V™ Issuer + Verification Launch Readiness

This repository contains the QR-V issuer portal, API service entrypoint, and public verification assets used for live-domain production launch checks.

## Core routes

- `/dashboard` — issuer metrics + launch readiness.
- `/onboarding` — first paying issuer onboarding flow.
- `/production-checklist` — deployment and go-live checklist.
- `/launch-demo` — live demo run-of-show and outreach links.
- `/certificates` — certificate inventory.
- `/certificates/new` — issue certificate wizard.
- `/revocations` — revoke and confirm public `REVOKED` state.
- `/revocations` — revoke and confirm public REVOKED state.

## Production services

- Issuer portal: `https://issuer.qrv.network`
- API service: `https://api.qrv.network`
- Public verification: `https://verify.qrv.network/{qrvid}`

## Production environment variables

Copy `.env.example` into your Hostinger project env settings (or local `.env.local`) and provide real secrets:

- `DATABASE_URL`
- `SIGNING_SECRET`
- `ISSUER_TOKEN`
- `JWT_SECRET`
- `ADMIN_TOKEN`

Validate before deploy:

```bash
npm run validate:prod
```

## First production seed record

- QRVID: `QRV-PROD-CERT-000001`
- Verification URL: `https://verify.qrv.network/QRV-PROD-CERT-000001`
- Expected public state: `VERIFIED`

## Smoke test command (live domain)

```bash
ISSUER_BASE_URL=https://issuer.qrv.network \
API_BASE_URL=https://api.qrv.network \
VERIFY_BASE_URL=https://verify.qrv.network \
SMOKE_API_KEY=*** \
SMOKE_JWT=*** \
npm run smoke:e2e
```

The smoke flow validates:

1. `GET /healthz`
2. `GET /readyz`
3. create certificate
4. verify returns `VERIFIED`
5. revoke certificate
6. verify returns `REVOKED`
7. verify missing QRVID returns `NOT_FOUND`

## First pilot flow

1. Confirm migrations are applied before traffic cutover.
2. Validate production env with `npm run validate:prod`.
3. Execute live smoke against production domains.
4. Confirm seed record resolves as `VERIFIED`.
5. Issue pilot certificate for external partner.
6. Share public verify URL and confirm deterministic state rendering.

## Local development

```bash
npm install
npm run dev
```

## Hostinger deployment (verify.qrv.network)

- **Runtime:** Node.js `22.x` (matches `engines.node` in `package.json`)
- **Install command:** `npm ci`
- **Build command:** `npm run build`
- **Start command:** `npm run start:server`
- **Bind host/port:** app listens on `0.0.0.0` and `process.env.PORT` (Hostinger-compatible)
- **Production branch:** deploy from `main` after merge

### Required environment variables

- `PORT` (provided by Hostinger at runtime)
- `NODE_ENV=production`
- `HOST_ROLE=verify` for verify.qrv.network (`issuer` for issuer.qrv.network, `api` for API-only host)
- `DATABASE_URL`
- `SIGNING_SECRET`
- `ISSUER_TOKEN`
- `JWT_SECRET`
- `ADMIN_TOKEN`
- Optional: `APP_VERSION` (shown by `/version`)

### Smoke test URLs

- `GET https://verify.qrv.network/`
- `GET https://verify.qrv.network/healthz`
- `GET https://verify.qrv.network/readyz`
- `GET https://verify.qrv.network/version`
- `GET https://verify.qrv.network/QRV-PROD-CERT-000001`
- `GET https://verify.qrv.network/verify/QRV-PROD-CERT-000001`
- `GET https://verify.qrv.network/api/v1/verify/QRV-PROD-CERT-000001`
- `GET https://verify.qrv.network/this-route-should-404`

### Post-merge release flow

1. Merge PR into `main`.
2. Redeploy `main` on Hostinger.
3. Run the smoke URLs above.
4. Tag release (example):

```bash
git checkout main
git pull
git tag v1.0.0-verification-portal
git push origin v1.0.0-verification-portal
```

## Smoke commands

- `npm run smoke:e2e` (API + verify flow)
- `npm run smoke:external` (live domain route + verify checks)

## Quality gates

```bash
npm run check
```

## App role routing

This Next.js app supports two deployment roles via `NEXT_PUBLIC_APP_ROLE`:

- `issuer` → `/` redirects to `/login` and issuer portal routes are available.
- `verify` → `/` renders the public verification landing page and `/{qrvid}` renders public verification results.

Verification records are fetched from:

- `${NEXT_PUBLIC_QRV_API_BASE_URL}/api/v1/verify/{qrvid}`

## Production host mapping

- `issuer.qrv.network` → Issuer control plane (`/` redirects to `/login`)
- `verify.qrv.network` → Public verification portal (`/` is branded public verify landing)
- `api.qrv.network` → API endpoints / JSON services
- `registry.qrv.network` → Registry service

See `docs/verify-domain-deployment.md` for host/domain rollout steps.
