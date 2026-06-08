# QR-V Live Deployment Audit and Domain Correction Checklist

Use this checklist to verify that the live QR-V domains route to the correct production service and do not leak another surface's UI or API responses.

## Required production domain map

| Domain | Required service | Runtime | Entrypoint / owner | Expected live surface |
| --- | --- | --- | --- | --- |
| `qrv.network` | `ohi-stack/qrv-node` | Express | `server.js` | Root QR-V network hub and `/status` page |
| `verify.qrv.network` | `ohi-stack/qrv-node` | Express | `server.js` | Public certificate verification routes |
| `api.qrv.network` | `ohi-stack/qrv-api` | Express | `server.js` | JSON API and health endpoints |
| `registry.qrv.network` | `ohi-stack/qrv-registry` | Express | `server.js` | Registry/status service |
| `issuer.qrv.network` | `ohi-stack/issuer-qrv` | Next.js | Next.js app deployment | Issuer login and dashboard UI |
| `store.qrv.network` | WordPress | WordPress | Managed WordPress site | QR-V store/commerce site |

## Automated audit

Run the live audit from this repository:

```bash
npm run audit:live
```

The script checks the production URLs below. Every result prints `PASS` or `FAIL`, the HTTP status, the actual content type, and the expected content type plus keyword marker.

| URL | Expected content type | Expected keyword marker |
| --- | --- | --- |
| `https://qrv.network` | `text/html` | QR-V hub marker (`QR-V`, `QRV.network`, `command hub`, or `Network Directory`) |
| `https://qrv.network/status` | `text/html` | Status marker (`Production Status`, `Status Links`, `API Health`, or `Registry Authority`) |
| `https://api.qrv.network/healthz` | `application/json` | Health/status JSON marker (`ok`, `healthy`, `health`, `status`, or `version`) |
| `https://verify.qrv.network/QRV-DEMO-001` | `text/html` | Verification marker (`Verification Result`, `QRV-DEMO-001`, or a verification state) plus styling marker |
| `https://issuer.qrv.network/login` | `text/html` | Issuer login marker (`issuer`, `login`, `sign in`, or `password`) |
| `https://registry.qrv.network` | `text/html` or `application/json` | Registry/status marker (`registry`, `status`, `ready`, `health`, or `authority`) |

Optional environment overrides:

| Variable | Purpose |
| --- | --- |
| `QRV_AUDIT_TIMEOUT_MS` | Per-request timeout in milliseconds. Defaults to `15000`. |
| `QRV_AUDIT_USER_AGENT` | User agent sent by the audit script. |
| `QRV_AUDIT_ROOT_URL` | Override `https://qrv.network`. |
| `QRV_AUDIT_ROOT_STATUS_URL` | Override `https://qrv.network/status`. |
| `QRV_AUDIT_API_HEALTHZ_URL` | Override `https://api.qrv.network/healthz`. |
| `QRV_AUDIT_VERIFY_DEMO_URL` | Override `https://verify.qrv.network/QRV-DEMO-001`. |
| `QRV_AUDIT_ISSUER_LOGIN_URL` | Override `https://issuer.qrv.network/login`. |
| `QRV_AUDIT_REGISTRY_URL` | Override `https://registry.qrv.network`. |

## Domain correction checklist

1. Confirm DNS records point each hostname at the intended hosting target for the required service in the production domain map.
2. Confirm TLS certificates cover each hostname and that HTTP redirects preserve the same hostname instead of redirecting to another QR-V surface.
3. Confirm reverse proxy or platform routing sends:
   - `qrv.network` and `verify.qrv.network` to `ohi-stack/qrv-node` / Express / `server.js`.
   - `api.qrv.network` to `ohi-stack/qrv-api` / Express / `server.js`.
   - `registry.qrv.network` to `ohi-stack/qrv-registry` / Express / `server.js`.
   - `issuer.qrv.network` to `ohi-stack/issuer-qrv` / Next.js.
   - `store.qrv.network` to WordPress.
4. Confirm backend-only domains (`api.qrv.network` and `registry.qrv.network`) do not serve issuer, verification, or marketing HTML unless that HTML is the intentional registry status page.
5. Confirm UI domains (`qrv.network`, `verify.qrv.network`, and `issuer.qrv.network`) do not expose JSON-only backend routes as their primary response.
6. Run `npm run audit:live` after every DNS, proxy, or deployment change and record any failing URL with the observed status, content type, and keyword mismatch.
7. Fix the routing layer before changing application code when a hostname serves the wrong repository or runtime.
8. Re-run the audit until all checks pass, then run `npm run build` before release sign-off.

## Failure triage

- **Wrong content type:** the hostname is likely routed to the wrong service or a default platform page.
- **Missing keyword:** the hostname may be correct but the deployed version is stale or the route is rendering the wrong page.
- **Redirect to another hostname:** update proxy redirects, canonical host settings, or platform domain aliases.
- **Timeout or DNS failure:** verify DNS propagation, hosting target health, firewall rules, and TLS provisioning.
