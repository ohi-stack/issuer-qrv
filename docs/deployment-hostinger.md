# Hostinger Deployment (Node.js 22.x)

## Runtime settings
- Node.js version: `22.x`
- Application root: `./`
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start`
- Startup entrypoint: `server.js` (invokes `src/server.js`)

## Required environment variables
Set all required values from `docs/environment.md` and `.env.example`.

## Domain role mapping
- `issuer.qrv.network` -> `HOST_ROLE=issuer`
- `api.qrv.network` -> `HOST_ROLE=api`
- `registry.qrv.network` -> `HOST_ROLE=api`
- `verify.qrv.network` -> `HOST_ROLE=verify`

## Post-deploy checks
1. `GET /health` responds JSON `{"status":"ok"}`.
2. `GET /ready` returns readiness and database state.
3. `GET /api/v1/verify/QRV-PROD-CERT-000001` returns a valid verification state.
