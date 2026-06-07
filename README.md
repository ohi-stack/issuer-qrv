# QR-V Network root site (`qrv.network`)

This repository now runs the production root marketing site for **qrv.network** as a Hostinger-compatible Node/Express application.

## Hostinger compatibility

Use these settings in Hostinger's Node.js app configuration:

- **Node version:** `20.x`
- **Application root:** `./`
- **Entry file:** `server.js`
- **Start command:** `npm start`
- **Install command:** `npm install`

The app intentionally uses a single `server.js` entry point and does not require a separate build step.

## Public site routes

The root site serves real route-specific pages for:

- `/`
- `/protocol`
- `/how-it-works`
- `/registry`
- `/use-cases`
- `/use-cases/certificates`
- `/use-cases/membership-id`
- `/use-cases/product-authentication`
- `/use-cases/document-verification`
- `/use-cases/asset-records`
- `/developers`
- `/pricing`
- `/book-demo`
- `/about`
- `/status`
- `/security`
- `/legal`
- `/privacy`
- `/terms`

The first product positioning is **QR-V Verified Certificates**. Pricing content includes:

- Starter Issuer
- Growth Issuer
- Professional Issuer
- Enterprise / Network Issuer
- Launch Packages

## Global QRVID verification redirect

Every page includes a global QRVID verification form. Submitting a QRVID redirects with HTTP `303` to:

```text
https://verify.qrv.network/{QRVID}
```

The local compatibility route also supports:

```text
GET /verify?qrvid={QRVID}
POST /verify
```

## Live Network URLs

Set the public URLs in `.env` using the values from `.env.example`:

- `QRV_PUBLIC_SITE_URL=https://qrv.network`
- `QRV_VERIFY_URL=https://verify.qrv.network`
- `QRV_REGISTRY_URL=https://registry.qrv.network`
- `QRV_API_URL=https://api.qrv.network`
- `QRV_ISSUER_URL=https://issuer.qrv.network`
- `QRV_DOCS_URL=https://docs.qrv.network`
- `QRV_DEVELOPERS_URL=https://developers.qrv.network`
- `QRV_STATUS_URL=https://status.qrv.network`

These values power the **Live Network** cards for:

- `qrv.network`
- `verify.qrv.network`
- `registry.qrv.network`
- `api.qrv.network`
- `issuer.qrv.network`
- `docs.qrv.network`
- `developers.qrv.network`
- `status.qrv.network`

## Health and runtime endpoints

Hostinger, uptime monitors, and load balancers can use:

- `/health`
- `/healthz`
- `/ready`
- `/readyz`
- `/version`
- `/ping`

## Local development

```bash
npm install
npm run check
npm start
```

Then open `http://localhost:3000`.

For a different local port:

```bash
PORT=3010 npm start
```

## Hostinger deployment steps

1. Upload or deploy the repository contents to the Hostinger Node.js application root.
2. Confirm the application root is `./` and the startup file is `server.js`.
3. Select Node `20.x`.
4. Add environment variables from `.env.example` in Hostinger's environment variable panel.
5. Run `npm install` from Hostinger or allow Hostinger to install dependencies.
6. Start the app with `npm start`.
7. Verify the deployment:
   - `https://qrv.network/health`
   - `https://qrv.network/ready`
   - `https://qrv.network/version`
   - `https://qrv.network/pricing`
   - Submit a QRVID and confirm it redirects to `https://verify.qrv.network/{QRVID}`.

## Compatibility notes

The app keeps lightweight issuer compatibility endpoints for existing operational tooling:

- `GET /issue`
- `POST /issue`
- `POST /api/issue`
- `POST /api/revoke/:qrvid`

These routes require registry credentials when creating or revoking live records. The public qrv.network root site does not require registry credentials to render marketing pages or health endpoints.

## Trust and legal disclaimer

QR-V provides registry-backed verification infrastructure and public status pages. QR-V does not automatically certify the truth, legality, ownership, identity, regulatory standing, or fitness of issuer-supplied content. Issuers remain responsible for their claims, and relying parties should review issuer identity, record scope, jurisdiction, applicable law, and current verification status before making decisions.
