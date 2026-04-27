# qrv-platform (Express multi-domain production service)

Single Express service that can run domain-specific behaviors for:

- `api.qrv.network` (API-only root)
- `issuer.qrv.network` (issuer portal MVP)
- `verify.qrv.network` (public verification)
- `registry.qrv.network` (live registry records)
- `qrv.network` (public demo flow)

## Production highlights

- `api.qrv.network` root returns JSON only:
  - `service`
  - `version`
  - `docs`
  - `status`
- Issuer portal MVP on `issuer.qrv.network`:
  - `/login`
  - `/dashboard`
  - `/records/create`
  - `/records/revoke`
  - `/analytics/scan`
- Verify routes read live registry records (`/api/v1/registry/:qrvid` or configured `REGISTRY_BASE_URL`).
- Seeded production demo QRVID: `QRV-DEMO-0001`.
- Public demo flow: `/demo` -> scan `QRV-DEMO-0001` -> `VERIFIED`.
- Uptime monitor endpoint checks verify/registry/api/issuer dependencies: `/api/v1/uptime`.

## Routes

- `/`
- `/demo`
- `/healthz`
- `/readyz`
- `/version`
- `/api/v1/uptime`
- `/api/v1/registry/:qrvid`
- `/api/v1/registry`
- `/api/v1/registry/:qrvid/revoke`
- `/api/v1/verify/:qrvid`
- `/verify/:qrvid`
- `/:qrvid`

## Scripts

- `npm run start` → `node server.js`
- `npm run build` → `echo "no build step"`
- `npm run dev` → `node server.js`

## Deploy (Hostinger)

Use the **Express** preset.

- Build command: `npm run build`
- Start command: `npm run start`

## Local run

```bash
npm install
npm run dev
```
