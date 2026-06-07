# issuer-qrv

QR-V issuer portal and certificate issuance control plane for `issuer.qrv.network`.

## Production role

This service is the issuer onboarding and monetization layer. It lets authorized issuers create QRVID-backed records, generate verification URLs and QR codes, revoke records, track verification scans, and confirm billing/API-key readiness.

## Public routes

- `/login` — issuer sign-in handoff page for edge-managed authentication.
- `/dashboard` — operational overview with issued records, scan counts, registry readiness, and audit events.
- `/records` — list records issued during the current portal runtime.
- `/records/new` — create a new registry-backed QR-V record.
- `/certificates` — certificate-oriented alias for record creation.
- `/issue` — issue form and POST handler.
- `/revoke` — revoke form and POST handler.
- `/api-keys` — issuer API-key setup and automation endpoint reference.
- `/settings` — production URL and runtime configuration check.
- `/billing` — commercial plan and Stripe readiness page.

## API routes

- `POST /api/issue` — creates a registry record through `POST /registry/create`.
- `GET /api/records` — returns records created during this runtime.
- `GET /api/records/:qrvid` — returns a local record or fetches `GET /registry/:qrvid` from the registry.
- `POST /api/revoke/:qrvid` — revokes through `POST /registry/:qrvid/revoke`.
- `POST /api/analytics/scan` — increments scan analytics for a QRVID.

## Runtime endpoints

- `/ping`
- `/health`
- `/healthz`
- `/ready`
- `/readyz`
- `/version`

The app boots without blocking on registry availability. Registry reads/writes happen inside route handlers, and readiness checks return `503` only from `/ready` or `/readyz` when the registry is unavailable.

## Required Hostinger environment pattern

```dotenv
NODE_ENV=production
APP_ENV=production
PORT=3000
APP_VERSION=1.1.0
TZ=UTC
LOG_LEVEL=info
APP_BASE_URL=https://issuer.qrv.network
VERIFY_BASE_URL=https://verify.qrv.network
REGISTRY_BASE_URL=https://registry.qrv.network
ISSUER_API_KEY=replace-with-issuer-registry-key
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

## Scripts

- `npm run start` → `node server.js`
- `npm run check` → `node --check server.js`
- `npm run dev` → `NODE_ENV=development node server.js`
- `npm run acceptance:live` → monitor-style live checks with `User-Agent: QRV-Monitor/1.0`

## Local run

```bash
npm install
npm run dev
```
