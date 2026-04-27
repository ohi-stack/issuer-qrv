# QR-V Live Acceptance Report

Date: 2026-04-27 (UTC)
Target: `https://verify.qrv.network`
Audit focus: `/`, `/verify/QRV-DEMO-001`, `/help`, `/scan`

## Commands executed
- `curl -sS -D - "https://verify.qrv.network/"`
- `curl -sS -D - "https://verify.qrv.network/verify/QRV-DEMO-001"`
- `curl -sS -D - "https://verify.qrv.network/help"`
- `curl -sS -D - "https://verify.qrv.network/scan"`
- `npm run acceptance:live`

## Production observations (exact current state)
All audited routes are currently blocked at the Hostinger edge with `HTTP 429 Too Many Requests` and empty response bodies:

- `/` -> `429`
- `/verify/QRV-DEMO-001` -> `429`
- `/help` -> `429`
- `/scan` -> `429`

Headers consistently include:
- `platform: hostinger`
- `panel: hpanel`
- `server: envoy`

Result: live UI HTML cannot be inspected from this runner because WAF/rate-limit policy blocks all page responses.

## Runtime determination (Next.js vs legacy Express)
### Confirmed
- The live edge currently serves only rate-limit responses (`429`), not application HTML, for all requested paths.

### High-confidence inference from deploy preset in this repo
- Hostinger preset in `docs/deployment-hostinger.md` is currently Node app mode with startup entrypoint `server.js` (Express service), not `next start`.
- `src/server.js` defines legacy HTML routes for `/`, `/verify/:id`, and `/:qrvid`.

Conclusion: the configured Hostinger runtime preset is legacy Express-oriented. The currently served production UI cannot be directly fingerprinted from this environment due universal `429` responses.

## Remediation plan (no-downtime migration to Next.js)
1. **Prepare Next.js runtime in staging hostname first**
   - Configure staging app in Hostinger with:
     - Node `22.x`
     - Install: `npm ci`
     - Build: `npm run build`
     - Start: `npm start` (runs `next start`)
   - Ensure all production env vars are present.
2. **Health-check gating before cutover**
   - Validate staged routes: `/`, `/verify/QRV-DEMO-001`, `/help`, `/scan`, `/api/v1/verify/:qrvid`, `/health`.
   - Capture smoke output and confirm no fallback to Express templates.
3. **Blue/green cutover**
   - Keep current Express app live (blue).
   - Bring Next.js app live on alternate app target (green).
   - Switch `verify.qrv.network` upstream target to green.
   - Keep blue running for rapid rollback during bake window.
4. **Rollback safety**
   - If KPI/uptime errors appear, repoint upstream to blue immediately.
5. **Finalize**
   - After bake window passes, decommission blue or retain as warm standby.

## Immediate blocker to resolve first
- Allowlist CI/ops probe traffic (or relax WAF path rules) so acceptance probes can receive actual app responses instead of platform `429`.
