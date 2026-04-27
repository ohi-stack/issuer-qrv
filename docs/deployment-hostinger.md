# Hostinger Deployment (Node.js 22.x)

## Current preset (legacy Express-oriented)
- Node.js version: `22.x`
- Application root: `./`
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start:server`
- Startup entrypoint: `server.js` (invokes `src/server.js`)

This preset serves the legacy Node/Express runtime and should be treated as the **blue** environment during migration.

## Target preset (Next.js runtime)
- Node.js version: `22.x`
- Application root: `./`
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start` (Next.js `next start`)

This preset serves the Next.js UI in `app/` and should be treated as the **green** environment during migration.

## Required environment variables
Set all required values from `docs/environment.md` and `.env.example`.

## Domain role mapping
- `issuer.qrv.network` -> `HOST_ROLE=issuer`
- `api.qrv.network` -> `HOST_ROLE=api`
- `registry.qrv.network` -> `HOST_ROLE=api`
- `verify.qrv.network` -> `HOST_ROLE=verify`

## No-downtime migration runbook (Hostinger blue/green)
1. Deploy the target Next.js preset to a parallel Hostinger app/service (green), keeping the current Express deployment untouched (blue).
2. Apply the same environment variable set to green.
3. Run smoke checks against green:
   - `GET /`
   - `GET /verify/QRV-DEMO-001`
   - `GET /help`
   - `GET /scan`
   - `GET /api/v1/verify/QRV-PROD-CERT-000001`
4. Shift `verify.qrv.network` routing to green.
5. Monitor 5xx/error-rate and latency for a defined bake window.
6. If issues occur, immediately repoint DNS/upstream routing back to blue.
7. After bake success, retire blue or keep as warm rollback target.

## Post-deploy checks
1. `GET /health` responds JSON `{"status":"ok"}`.
2. `GET /ready` returns readiness and database state.
3. `GET /api/v1/verify/QRV-PROD-CERT-000001` returns a valid verification state.
