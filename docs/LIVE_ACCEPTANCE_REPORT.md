# QR-V Live Acceptance Report

Date: 2026-04-27 (UTC)
Target QRVID: `QRV-PROD-CERT-000001`

## Scope
This workspace currently contains only `issuer-qrv`. Cross-repo synchronization was audited for local availability and scripted checks were added so the same process can be run once sibling repos are mounted.

## Repository Availability Audit (`npm run audit:repo-family`)
- issuer-qrv: present
- qrv-api: missing in workspace
- qrv-registry: missing in workspace
- qrv-verify: missing in workspace
- qrv-demo-records: missing in workspace
- qrv-status: missing in workspace
- qrv-infra: missing in workspace
- qrv-security: missing in workspace

## Live Acceptance Run (`npm run acceptance:live`)
Observed statuses:
- `issuer.qrv.network/health` -> `429`
- `api.qrv.network/health` -> `429`
- `api.qrv.network/ping` -> `429`
- `api.qrv.network/version` -> `429`
- `registry.qrv.network/health` -> `429`
- `verify.qrv.network/health` -> `429`
- `verify.qrv.network/api/v1/verify/QRV-PROD-CERT-000001` -> `429`
- `verify.qrv.network/QRV-PROD-CERT-000001` -> `429`

## Acceptance Outcome
Full live production acceptance is currently **blocked** by upstream HTTP `429 Too Many Requests` responses across all public hosts during this run.

## Next Actions
1. Adjust WAF/rate-limit rules to allow health/acceptance probe traffic from CI/ops runner.
2. Re-run `npm run acceptance:live` once probe traffic is allowlisted.
3. Mount remaining repos and run `npm run audit:repo-family` until all required repos are available.
