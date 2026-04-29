# QR-V Repository Map

This repository currently contains a combined implementation that spans multiple QR-V production roles.

## Confirmed mapping from code in this repo

- **issuer.qrv.network code**: present in this repo (`server.js`) via issuer dashboard routes (`/login`, `/records`, `/records/new`, `/billing`, `/api-keys`, `/settings`) and issuer record APIs (`/issuer/records`, `/issuer/records/:qrvid`).
- **verify.qrv.network code**: present in this repo (`server.js`) via public verification route (`GET /verify/:qrvid`) and public-facing verify UX route (`GET /verify`).
- **api.qrv.network routes**: present in this repo (`server.js`) via platform endpoints such as `/health`, `/ready`, `/version`, `/registry/create`, `/registry/revoke`.
- **registry schema/migrations**: present in this repo under `db/schema.sql` (core tables for issuers, records, revocations, audit logs, API keys, billing, usage).

## Notes

- The package name is currently `qrv-verify`, but the codebase includes issuer, verify, API, and registry concerns in one service.
- If/when repos are split, this file should be updated to point to the canonical repo for each production domain.
