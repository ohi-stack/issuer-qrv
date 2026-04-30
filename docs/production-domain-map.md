# Production Domain Ownership Map

This map is the source of truth for QR-V production domain boundaries.

| Domain | Ownership | Allowed surface | Blocked surface |
| --- | --- | --- | --- |
| `api.qrv.network` | Backend API service | Backend/status endpoints only (for example `/healthz`, `/readyz`, `/version`) returning JSON | Any issuer or verification HTML UI routes |
| `issuer.qrv.network` | Issuer application | Issuer UI only (login/dashboard issuer workflows) | Verification-only UI routes and backend-only domains |
| `verify.qrv.network` | Verification application | Verification UI only (`/`, `/scan`, `/help`, `/verify/:id`) | Issuer-only routes |
| `registry.qrv.network` | Registry/status backend | Registry/status endpoints only (JSON status + registry backend APIs) | Any issuer or verification HTML UI routes |

## Enforcement in this repository

- Domain ownership is enforced in `middleware.ts` using host-based allowlists.
- Backend-only hosts return a JSON 404 payload for any non-status route.
- Unknown hosts return JSON 404 payloads to avoid cross-domain UI leakage.
