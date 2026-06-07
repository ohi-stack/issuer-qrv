# QRV live domain deployment map

This document is the deployment contract for the live QRV production hostnames. It records the required repository/service owner, framework, runtime entry file, environment variables, and smoke-test URLs for each live domain.

## Required live mapping

| Live domain | Required repo / service | Framework / runtime | Runtime entry file | Required environment variables | Test URLs |
| --- | --- | --- | --- | --- | --- |
| `qrv.network` | `qrv-node` | Node.js / Express command hub | `server.js` | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_VERSION`, `APP_BASE_URL`, `QRV_PUBLIC_SITE_URL`, `QRV_VERIFY_URL`, `QRV_ISSUER_URL`, `QRV_REGISTRY_URL`, `QRV_API_URL`, `QRV_STORE_URL`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | `https://qrv.network`, `https://qrv.network/status` |
| `api.qrv.network` | `qrv-api` | Node.js JSON API service | `server.js` | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_VERSION`, `DATABASE_URL`, `REGISTRY_BASE_URL`, `VERIFY_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | `https://api.qrv.network/healthz` |
| `registry.qrv.network` | `qrv-registry` | Node.js registry/status service | `server.js` | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_VERSION`, `DATABASE_URL`, `REGISTRY_API_KEY`, `SIGNING_SECRET`, `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | `https://registry.qrv.network` |
| `issuer.qrv.network` | `issuer-qrv` | Next.js App Router issuer application | `app/page.tsx`, `middleware.ts` | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_VERSION`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_ROLE=issuer`, `NEXT_PUBLIC_QRV_API_BASE_URL`, `NEXT_PUBLIC_QRV_VERIFY_BASE_URL`, `NEXT_PUBLIC_QRV_REGISTRY_BASE_URL`, `ISSUER_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` | `https://issuer.qrv.network/login`, `https://issuer.qrv.network/healthz` |
| `verify.qrv.network` | Public verification runtime | Next.js App Router public verification application | `app/page.tsx`, `app/[qrvid]/page.tsx`, `middleware.ts` | `NODE_ENV`, `APP_ENV`, `PORT`, `APP_VERSION`, `NEXT_PUBLIC_APP_ROLE=verify`, `NEXT_PUBLIC_QRV_API_BASE_URL`, `NEXT_PUBLIC_QRV_VERIFY_BASE_URL`, `NEXT_PUBLIC_QRV_REGISTRY_BASE_URL` | `https://verify.qrv.network`, `https://verify.qrv.network/QRV-DEMO-001` |
| `store.qrv.network` | WordPress / WooCommerce production install | WordPress / PHP | `index.php`, `wp-config.php`, active theme/plugin entry files | `WORDPRESS_DB_HOST`, `WORDPRESS_DB_NAME`, `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WP_HOME=https://store.qrv.network`, `WP_SITEURL=https://store.qrv.network`, payment-provider secrets configured in WordPress/WooCommerce admin | `https://store.qrv.network` |

## Domain-specific notes

### `qrv.network` → `qrv-node`

- Purpose: public command hub and navigation surface for the QRV network.
- The root URL must return HTML for the hub page.
- `/status` must return the hub status page with links to the live service domains.
- It must not replace or proxy the issuer, verify, API, registry, or store runtimes.

### `api.qrv.network` → `qrv-api`

- Purpose: JSON API gateway for health, issuance, lookup, and revocation flows.
- `/healthz` must return JSON and be safe for uptime monitors.
- API responses must not render issuer or verification HTML.

### `registry.qrv.network` → `qrv-registry`

- Purpose: canonical registry/status authority for QRVID lifecycle state.
- The root URL should return a registry/status response that identifies the registry service or its health/status.
- Registry writes must require service credentials; public smoke tests should stay read-only.

### `issuer.qrv.network` → `issuer-qrv`

- Purpose: issuer-facing SaaS application for login, dashboard, credential issuance, revocation, billing, and API keys.
- `/login` must return issuer login HTML.
- Issuer-only pages must remain on `issuer.qrv.network`; public verification results must remain on `verify.qrv.network`.

### `verify.qrv.network` → public verification runtime

- Purpose: public, relying-party verification surface.
- `/QRV-DEMO-001` must return a styled verification result page for the demo QRVID.
- Verification pages must call the public API base from `NEXT_PUBLIC_QRV_API_BASE_URL` and display public status only.

### `store.qrv.network` → WordPress

- Purpose: WordPress/WooCommerce commerce, checkout, and onboarding package surface.
- The store is intentionally outside the Node.js service family.
- Node applications should link to the store for purchase/checkout flows instead of rendering checkout locally.

## Automated audit

Run the live-domain audit from this repository:

```bash
npm run audit:live
```

The audit checks the required production URLs and prints `PASS` or `FAIL` for each domain check. A non-zero exit code means one or more required live mappings failed the audit.

The audit URL defaults can be overridden with these environment variables when testing staging cutovers or alternate DNS targets:

- `QRV_AUDIT_ROOT_URL`
- `QRV_AUDIT_ROOT_STATUS_URL`
- `QRV_AUDIT_API_HEALTHZ_URL`
- `QRV_AUDIT_REGISTRY_URL`
- `QRV_AUDIT_ISSUER_LOGIN_URL`
- `QRV_AUDIT_VERIFY_DEMO_URL`
- `QRV_AUDIT_TIMEOUT_MS`
- `QRV_AUDIT_USER_AGENT`
