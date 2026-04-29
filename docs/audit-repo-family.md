# Audit: repo-family (expanded)

Date: 2026-04-29
Scope: `qrv-infra` repository snapshot in this workspace (`/workspace/issuer-qrv`).

## 1) Package versions

- Runtime package file is minimal:
  - `name`: `qrv-verify`
  - `version`: `1.0.0`
  - dependency: `express@^4.21.2`
  - engines: `node 22.x`, `npm 10.x`
- Lockfile is present (`package-lock.json`), so versions can be pinned in deploy environments.

**Risk / note**
- There is drift in project naming (`qrv-verify` in package metadata vs `qrv-platform` in README), which can create confusion during CI/CD artifact tracking.

## 2) API URLs

### Declared in environment templates/docs

- `.env.example` exposes public bases:
  - `APP_BASE_URL=https://issuer.qrv.network`
  - `VERIFY_BASE_URL=https://verify.qrv.network`
  - `NEXT_PUBLIC_QRV_API_BASE_URL=https://api.qrv.network`
  - `NEXT_PUBLIC_QRV_VERIFY_BASE_URL=https://verify.qrv.network`
  - `NEXT_PUBLIC_QRV_REGISTRY_BASE_URL=https://registry.qrv.network`
- `docs/domain-role-map.md` documents API/issuer/verify/registry responsibilities and endpoints.

### Used in code

- `server.js` uses `REGISTRY_BASE_URL` (default `https://registry.qrv.network`) for record creation and registry JSON links.
- `server.js` hardcodes verify fallback to `https://verify.qrv.network/{qrvid}`.

**Risk / note**
- URL variable names are mixed between `*_BASE_URL` and `*_BASE` patterns (`NEXT_PUBLIC_QRV_API_BASE_URL` and `NEXT_PUBLIC_QRV_API_BASE` both appear in `.env.example`).

## 3) Environment variable consistency

### Consistent

- Security/runtime essentials align across `.env.example` and `docs/environment.md`:
  - `DATABASE_URL`, `SIGNING_SECRET`, `ISSUER_TOKEN`, `JWT_SECRET`, `ADMIN_TOKEN`, `PORT`, `HOST_ROLE`.

### Inconsistent / gaps

- `.env.example` includes `CORS_ALLOWED_ORIGINS`, but `docs/environment.md` does not list it.
- `.env.example` includes NEXT_PUBLIC variables, while `server.js` does not consume them.
- `server.js` uses `REGISTRY_BASE_URL` and `ISSUER_NAME`, but these are not documented in `docs/environment.md` required/optional tables.
- Optional compatibility aliases are listed in `.env.example`, but not explained in docs.

## 4) Domain mapping

- `docs/domain-role-map.md` defines a multi-domain architecture (`api`, `issuer`, `verify`, `registry`, root domain).
- Current `server.js` behavior is issuer-portal centric (dashboard/forms/record creation) plus generic health/version endpoints.
- README route list still claims broader platform routes (registry and verify APIs) that are not present in this server snapshot.

**Risk / note**
- Documented domain map and implemented route surface are partially out of sync.

## 5) Health endpoint presence

### Present in `server.js`

- `/health`
- `/ping`
- `/version`
- `/healthz`
- `/readyz`

### Missing vs README/domain docs claims

- `/api/v1/uptime` is documented but not implemented in this file.

## 6) Build scripts

### Present

- `start`: `node server.js`
- `dev`: `node server.js`
- `build`: `echo "no build step"`
- `acceptance:live`: `node scripts/acceptance-live.mjs`

**Risk / note**
- Build is a no-op. This is valid for plain Node runtime, but can hide missing compile/lint/test gates in deployment pipelines.

## 7) Missing README check

- Root README exists (`README.md`).
- Subdirectories that currently have no local README:
  - `docs/`
  - `scripts/`
  - `db/`
  - `types/`
  - `artifacts/`
  - `qrv-demo-records/`

**Recommendation**
- Add short README files for `db/` (schema lifecycle + migration order) and `scripts/` (script intent + required env), then optionally for `artifacts/` and `qrv-demo-records/` as provenance notes.

## Priority actions

1. Normalize env variable names (`*_BASE_URL` convention) and remove deprecated duplicates.
2. Align docs (`README.md`, `docs/environment.md`, `docs/domain-role-map.md`) to current implemented routes.
3. Document `REGISTRY_BASE_URL` and `ISSUER_NAME` in environment docs.
4. Decide whether `/api/v1/uptime` should be implemented or removed from docs.
5. Add targeted README files in `db/` and `scripts/`.
