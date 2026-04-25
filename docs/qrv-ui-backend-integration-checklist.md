# QRV UI + Backend Integration Checklist

## Required environment variables

Issuer portal:

- `NEXT_PUBLIC_QRV_API_BASE_URL` (default: `https://api.qrv.network`)
- `NODE_ENV` (`development`, `test`, `production`)

Smoke script:

- `QRV_API_BASE_URL` (default: `https://api.qrv.network`)
- `QRV_VERIFY_BASE_URL` (default: `https://verify.qrv.network`)
- `QRV_SMOKE_API_TOKEN` (recommended in non-local environments)

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

## Smoke test criteria

Use `npm run smoke:e2e` and confirm the sequence:

1. Create certificate through `POST /certificates`.
2. Verify public status for `https://verify.qrv.network/{qrvid}` is `VERIFIED`.
3. Revoke certificate through `POST /certificates/{qrvid}/revoke`.
4. Verify public status transitions to `REVOKED`.
5. Verify a missing id returns `NOT_FOUND`.

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
