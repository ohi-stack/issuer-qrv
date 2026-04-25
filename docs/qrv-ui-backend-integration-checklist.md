# QRV UI + Backend Integration Checklist

## Required environment variables

Issuer portal:

- `NEXT_PUBLIC_QRV_API_BASE_URL` (default: `https://api.qrv.network`)
- `NODE_ENV` (`development`, `test`, `production`)

Smoke script:

- `QRV_API_BASE_URL` (default: `https://api.qrv.network`)
- `QRV_VERIFY_BASE_URL` (default: `https://verify.qrv.network`)
- `QRV_SMOKE_API_TOKEN` (recommended in non-local environments)
- `QRV_ISSUER_BASE_URL` (default: `https://issuer.qrv.network`) for `smoke:external`

Hostinger deployment:

- Node.js runtime: 20.x LTS or newer
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Required domain mappings: `issuer.qrv.network` (portal), `verify.qrv.network` (public verification)

## Local run instructions

1. Install dependencies:
   - `npm install`
2. Run quality gates:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
3. Start local UI:
   - `npm run dev`

## Production deployment order

1. Deploy backend API + registry changes (`api.qrv.network`, `registry.qrv.network`).
2. Validate `/health`, issuer auth, certificate create/revoke endpoints.
3. Deploy issuer portal (`issuer.qrv.network`) pointing to canonical API base URL.
4. Validate public verification host (`verify.qrv.network`) for public states.
5. Run smoke flow after deployment.
6. Run `npm run smoke:external` against live domains.

## Smoke test criteria

Use `npm run smoke:e2e` and confirm the sequence:

1. Create certificate through `POST /certificates`.
2. Verify public status for `https://verify.qrv.network/{qrvid}` is `VERIFIED`.
3. Revoke certificate through `POST /certificates/{qrvid}/revoke`.
4. Verify public status transitions to `REVOKED`.
5. Verify a missing id returns `NOT_FOUND`.
6. Keep `QRV-PROD-CERT-000001` as a permanent public demo certificate for launch demos.
7. Keep `QRV-PROD-CERT-000002` as a permanent public revoked demo certificate.

Public verification statuses for end-user UI are limited to:

- `VERIFIED`
- `REVOKED`
- `EXPIRED`
- `NOT_FOUND`

`INVALID_SIGNATURE` and `ERROR` are treated as internal/backend diagnostics unless intentionally surfaced in admin tooling.

## Rollback notes

If smoke checks fail after a frontend deploy:

1. Roll back issuer portal to the previous stable build.
2. Keep backend live if API health and registry persistence remain stable.
3. Re-run `npm test` and `npm run build` in CI with deployed API contract fixtures.
4. Re-deploy frontend only after route smoke tests and API client tests pass.

## Pilot launch target (7-day path to first paying issuer)

1. Day 1: Confirm Hostinger env and deploy latest build.
2. Day 2: Run smoke flow and validate `VERIFIED` + `REVOKED` public status transitions.
3. Day 3: Validate onboarding handoff (`/onboarding`) with an internal issuer.
4. Day 4-5: Share `QRV-PROD-CERT-000001` public verification URL in sales/demo materials.
5. Day 6-7: Onboard first paying issuer and monitor analytics/audit logs.

## Uptime monitoring minimums

1. Monitor `/dashboard`, `/onboarding`, and `/production-checklist` on `issuer.qrv.network`.
2. Monitor `/verify/QRV-PROD-CERT-000001` expecting `VERIFIED`.
3. Monitor `/verify/QRV-PROD-CERT-000002` expecting `REVOKED`.
4. Trigger pager/Slack alerts after 2 consecutive failures.
