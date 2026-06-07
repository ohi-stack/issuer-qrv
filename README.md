# QR-V Network root site (`qrv.network`)

This repository runs the production root-domain command hub for **QRV.network** as a Hostinger-compatible Node/Express application. The root domain consolidates navigation, commercial messaging, demos, status links, and service discovery without removing the operational subdomains.

## Production role

`qrv.network` is the public command hub for the QR-V service family. Operational trust surfaces remain separated so the public verifier, issuer app, registry authority, API gateway, documentation, monitoring, commerce, and internal operations can be deployed, monitored, and secured independently.

## Root-domain routes

The root site serves route-specific pages for:

- `/` — public command hub with verification entry, network directory, activation flow, demo record, and pricing gateway.
- `/verify` — root verification entry that redirects QRVID lookups to `verify.qrv.network`.
- `/issuer` — issuer portal explanation and handoff to `issuer.qrv.network`.
- `/docs` — documentation handoff to `docs.qrv.network`.
- `/developers` — developer portal handoff to `developers.qrv.network`.
- `/pricing` — issuer plan pricing and checkout handoff to `store.qrv.network`.
- `/status` — status center handoff and service directory.
- `/store` — commerce handoff to the WordPress/WooCommerce store.
- `/network` — full service directory with roles, hosts, and visibility.

The app also preserves legacy public marketing paths such as `/protocol`, `/how-it-works`, `/registry`, `/use-cases/*`, `/book-demo`, `/about`, `/security`, `/legal`, `/privacy`, and `/terms` so existing links continue to resolve while the main experience consolidates around the command-hub routes.

## Operational subdomains

QRV.network links to, but does not collapse, these production services:

- `verify.qrv.network` — public verification trust surface.
- `issuer.qrv.network` — issuer SaaS app.
- `registry.qrv.network` — canonical registry authority.
- `api.qrv.network` — JSON API gateway.
- `docs.qrv.network` — standards and documentation.
- `developers.qrv.network` — SDKs and integration resources.
- `status.qrv.network` — monitoring and incidents.
- `admin.qrv.network` — protected internal operations.
- `store.qrv.network` — WordPress/WooCommerce commerce.

## First live activation path

The command hub presents the production lifecycle as:

1. Create Certificate
2. Save Through API
3. Store In Registry
4. Verify Publicly
5. Return VERIFIED

The primary call-to-action order is:

1. Issue Certificate
2. Verify Demo Record
3. View API Docs
4. View Plans

The demo QRVID is `QRV-DEMO-001`, which links to:

```text
https://verify.qrv.network/QRV-DEMO-001
```

## Issuer pricing gateway

The pricing page presents these commercial entry points and routes checkout to `store.qrv.network`:

- Starter Issuer — `$199/month`
- Growth Issuer — `$499/month`
- Professional Issuer — `$1,500/month`
- Enterprise / Network Issuer — `$5,000+/month`

## Compatibility issuer endpoints

The root app keeps lightweight compatibility API endpoints for existing tooling, but public issuer pages now hand off to `issuer.qrv.network`:

- `POST /api/issue` — creates a registry record through `POST /registry/create`.
- `GET /api/records` — returns records created during this runtime.
- `GET /api/records/:qrvid` — returns a local record or fetches `GET /registry/:qrvid` from the registry.
- `POST /api/revoke/:qrvid` — revokes through `POST /registry/:qrvid/revoke`.
- `POST /api/analytics/scan` — increments scan analytics for a QRVID.

## Runtime endpoints

Hostinger, uptime monitors, and load balancers can use:

- `/ping`
- `/health`
- `/healthz`
- `/ready`
- `/readyz`
- `/version`

The root app boots without blocking on registry availability. Registry reads/writes happen inside compatibility API handlers, and the root marketing pages render without registry credentials.

## Required Hostinger environment pattern

```dotenv
NODE_ENV=production
APP_ENV=production
PORT=3000
APP_VERSION=1.2.0
TZ=UTC
LOG_LEVEL=info
APP_BASE_URL=https://qrv.network
QRV_PUBLIC_SITE_URL=https://qrv.network
QRV_VERIFY_URL=https://verify.qrv.network
QRV_ISSUER_URL=https://issuer.qrv.network
QRV_REGISTRY_URL=https://registry.qrv.network
QRV_API_URL=https://api.qrv.network
QRV_DOCS_URL=https://docs.qrv.network
QRV_DEVELOPERS_URL=https://developers.qrv.network
QRV_STATUS_URL=https://status.qrv.network
QRV_ADMIN_URL=https://admin.qrv.network
QRV_STORE_URL=https://store.qrv.network
VERIFY_BASE_URL=https://verify.qrv.network
REGISTRY_BASE_URL=https://registry.qrv.network
ISSUER_API_KEY=replace-with-issuer-registry-key
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=180
```

## Hostinger compatibility

Use these settings in Hostinger's Node.js app configuration:

- **Node version:** `20.x`
- **Application root:** `./`
- **Entry file:** `server.js`
- **Start command:** `npm start`
- **Install command:** `npm install`

The app intentionally uses a single `server.js` entry point and does not require a separate build step.

## Current 503 triage for `verify.qrv.network`

If the public verifier returns `503 Service Unavailable`, fix that deployment before launching new public campaigns. Check in this order:

1. Confirm `qrv-verify` is assigned to `verify.qrv.network` in Hostinger.
2. Confirm the start command is `npm start`.
3. Confirm Hostinger sets `PORT` and the app listens on that port.
4. Confirm `REGISTRY_BASE_URL=https://registry.qrv.network`.
5. Confirm `https://verify.qrv.network/healthz` responds.
6. Confirm `https://verify.qrv.network/readyz` responds.
7. Confirm `https://verify.qrv.network/QRV-DEMO-001` loads.

## Scripts

- `npm run start` → `node server.js`
- `npm run check` → `node --check server.js`
- `npm run build` → no-op Hostinger compatibility build
- `npm run dev` → `NODE_ENV=development node server.js`
- `npm run acceptance:live` → monitor-style live checks with `User-Agent: QRV-Monitor/1.0`
- `npm run smoke:domains` → live content-type smoke checks for primary service hosts

## Local development

```bash
npm install
npm run check
PORT=3010 npm start
```

Then open `http://localhost:3010`.

## Trust and legal disclaimer

QR-V provides registry-backed verification infrastructure and public status pages. QR-V does not automatically certify the truth, legality, ownership, identity, regulatory standing, or fitness of issuer-supplied content. Issuers remain responsible for their claims, and relying parties should review issuer identity, record scope, jurisdiction, applicable law, and current verification status before making decisions.
