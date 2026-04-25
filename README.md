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

## Smoke commands

- `npm run smoke:e2e` (API + verify flow)
- `npm run smoke:external` (live domain route + verify checks)

## Quality gates

```bash
npm run check
```
