# QRV Domain Role Map (Production)

## Clean domain responsibilities

- `api.qrv.network`
  - API-only surface.
  - Root (`/`) returns JSON with `service`, `version`, `docs`, and `status`.
  - Operational endpoints: `/healthz`, `/readyz`, `/version`, `/api/v1/uptime`.

- `issuer.qrv.network`
  - Issuer portal UI + workflow actions.
  - MVP modules: `login`, `dashboard`, `create record`, `revoke record`, `scan analytics`.

- `verify.qrv.network`
  - Public verification pages + API verification responses.
  - Reads QRVID status from live registry records.

- `registry.qrv.network`
  - Registry record source of truth endpoint:
    - `GET /api/v1/registry/:qrvid`
    - `POST /api/v1/registry`
    - `POST /api/v1/registry/:qrvid/revoke`

- `qrv.network`
  - Public demo flow at `/demo`.
  - Demo QRVID: `QRV-DEMO-0001`.
