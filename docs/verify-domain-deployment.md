# verify.qrv.network deployment guide

This guide configures the same `issuer-qrv` Next.js app to run as the **public verify frontend** on `verify.qrv.network`.

## 1) Hostinger settings

In Hostinger (or your Node host), configure `verify.qrv.network` to deploy this repo and run the Next.js app:

- Build command: `npm run build`
- Start command: `npm run start`
- Node runtime: 20+
- Do **not** point verify traffic at the legacy Express fallback server (`npm run start:server`), because that process responds with plain text and does not serve the Next frontend routes.

## 2) Required environment variables

Set these for the **verify** deployment:

```bash
NEXT_PUBLIC_APP_ROLE=verify
NEXT_PUBLIC_QRV_API_BASE_URL=https://api.qrv.network
```

Set these for the **issuer** deployment:

```bash
NEXT_PUBLIC_APP_ROLE=issuer
NEXT_PUBLIC_QRV_API_BASE_URL=https://api.qrv.network
```

Notes:

- The verify UI resolves records through `GET ${NEXT_PUBLIC_QRV_API_BASE_URL}/api/v1/verify/{qrvid}`.
- If `NEXT_PUBLIC_APP_ROLE` is missing/invalid, the app defaults to `issuer` behavior.

## 3) Expected routes by role

### verify role (`NEXT_PUBLIC_APP_ROLE=verify`)

- `/` renders **QRV Public Verification** landing page.
- `/QRV-PROD-CERT-000001` renders verification details from API.
- `/{unknown-qrvid}` renders NOT_FOUND state in verification UI.

### issuer role (`NEXT_PUBLIC_APP_ROLE=issuer`)

- `/` redirects to `/login`.
- `/{qrvid}` public verify page is not served.

## 4) Smoke tests

Run post-deploy smoke checks:

```bash
VERIFY_BASE_URL=https://verify.qrv.network \
SEEDED_QRVID=QRV-PROD-CERT-000001 \
npm run smoke:verify-domain
```

The smoke script validates:

1. verify root (`/`) returns HTML and includes `QRV Public Verification`.
2. seeded QRVID page returns HTML and includes `VERIFIED` UI text.
3. unknown QRVID page returns HTML and includes `NOT_FOUND` UI text.

If any check returns plain `Not found` text or a non-HTML response, the deployment is still misrouted.
