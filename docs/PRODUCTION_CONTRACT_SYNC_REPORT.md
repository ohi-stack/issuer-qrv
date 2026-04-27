# QR-V Production Contract Sync Report

Date: 2026-04-27 (UTC)
Workspace root: `/workspace`
Coordinator repo: `issuer-qrv`

## Canonical Production URLs
- `QRV_API_BASE_URL=https://api.qrv.network`
- `QRV_VERIFY_BASE_URL=https://verify.qrv.network`
- `QRV_REGISTRY_BASE_URL=https://registry.qrv.network`
- `CORS_ALLOWED_ORIGINS=https://issuer.qrv.network,https://verify.qrv.network,https://qrv.network`

## Priority Order
1. `qrv-api`
2. `qrv-verify`
3. `qrv-registry`
4. `qrv-status`
5. `qrv-infra`
6. `qrv-security`

## Synchronization Execution
Command:

```bash
npm run sync:production-contract
```

Current workspace result:
- `qrv-api`: blocked (repo not mounted at `/workspace/qrv-api`)
- `qrv-verify`: blocked (repo not mounted at `/workspace/qrv-verify`)
- `qrv-registry`: blocked (repo not mounted at `/workspace/qrv-registry`)
- `qrv-status`: blocked (repo not mounted at `/workspace/qrv-status`)
- `qrv-infra`: blocked (repo not mounted at `/workspace/qrv-infra`)
- `qrv-security`: blocked (repo not mounted at `/workspace/qrv-security`)

## Unresolved Blockers
1. Sibling repositories are not present in this execution environment.
2. Contract-level implementation checks for endpoints/routes/docs cannot be applied until the sibling repos are mounted.
3. Cross-repo build/test validation cannot execute until each target repository is available with its own dependencies.

## Exact Deployment Steps (once sibling repos are available)
1. Mount repositories under `/workspace` as:
   - `/workspace/qrv-api`
   - `/workspace/qrv-verify`
   - `/workspace/qrv-registry`
   - `/workspace/qrv-status`
   - `/workspace/qrv-infra`
   - `/workspace/qrv-security`
2. In each repo, set canonical production values in `.env.example` and deployment environment variables.
3. Run in each repo:
   - `npm install`
   - `npm run check` (if defined)
   - `npm test` (if defined)
   - `npm run build` (if defined)
4. Deploy each repo in the same priority order listed above.
5. After deployment, run live smoke checks:
   - `https://api.qrv.network/health`
   - `https://api.qrv.network/ping`
   - `https://api.qrv.network/version`
   - `https://verify.qrv.network/QRV-PROD-CERT-000001`
   - `https://registry.qrv.network`
6. Confirm status policy in `qrv-status`:
   - `200` => `OPERATIONAL`
   - `429` => `RATE_LIMITED` / `DEGRADED`
7. Record acceptance report and production evidence artifacts.

## Live Acceptance
Network access is available from this environment, but acceptance for sibling repos is blocked by missing local source repositories. Re-run once repositories are mounted.
