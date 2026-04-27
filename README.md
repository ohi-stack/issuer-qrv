# QR-V™ Public Verification UI — Production V1

Canonical public trust layer for **verify.qrv.network** built with Next.js + TypeScript.

## Route map

- `/` — landing page with QRVID input and trust explainer
- `/verify/[qrvid]` — public verification result
- `/[qrvid]` — legacy single-segment route redirected to `/verify/[qrvid]`
- `/scan` — scanner placeholder
- `/help` — public help and interpretation guide
- `/api-status` — API contract and endpoint status reference

## Environment variables

Copy `.env.example` into `.env.local`:

```bash
NEXT_PUBLIC_QRV_API_BASE=https://api.qrv.network
NEXT_PUBLIC_APP_ROLE=verify
```

- `NEXT_PUBLIC_QRV_API_BASE` defaults to `https://api.qrv.network`.

## Verification contract

```http
GET https://api.qrv.network/verify/:qrvid
```

The UI supports these user inputs:

- `QRV-` IDs (`QRV-[A-Z0-9-]+`)
- `QRV://...` identifiers
- `https://verify.qrv.network/...` URLs

Inputs are normalized to canonical QRVID before API resolution.

## Result states

- `VERIFIED`
- `REVOKED`
- `EXPIRED`
- `NOT_FOUND`
- `INVALID_FORMAT`
- `UNAVAILABLE`

## Security notes

- Public-safe fallback messaging only (no stack traces/internal errors).
- React text rendering only (no unsafe HTML injection).
- Network/API failures render `UNAVAILABLE`.

## Local development

```bash
npm install
npm run dev
```

## Deployment notes

- Deploy on Node.js 22.x.
- Build command: `npm run build`
- Start command: `npm run start`
- Configure host `verify.qrv.network` with `NEXT_PUBLIC_APP_ROLE=verify`.
- Canonical public URL format is `https://verify.qrv.network/verify/:qrvid` (legacy `/:qrvid` is retained for compatibility).

## Production V1 live validation

Run a quick public smoke test on the deployed domain:

- `https://verify.qrv.network`
- `https://verify.qrv.network/scan`
- `https://verify.qrv.network/help`
- `https://verify.qrv.network/api-status`
- `https://verify.qrv.network/verify/QRV-TEST-001`
- `https://verify.qrv.network/QRV-TEST-001`

Acceptance checks:

1. Valid QRVID input normalizes and routes to `/verify/:qrvid`.
2. `/QRV-...` legacy path redirects to `/verify/QRV-...`.
3. Verification fetches `GET https://api.qrv.network/verify/:qrvid`.
4. `VERIFIED`, `NOT_FOUND`, `INVALID_FORMAT`, and `UNAVAILABLE` states render with public-safe messaging.
5. "Copy canonical URL" uses `https://verify.qrv.network/verify/:qrvid`.
6. Issuer CTA opens `issuer.qrv.network`.
7. Mobile layout remains readable and actionable.
8. Raw backend/internal errors are not exposed.
