# QRV Uptime Monitoring Setup

## Runtime endpoint

- Internal monitor endpoint: `GET /api/v1/uptime`
- Checks these production services:
  - `verify`: `https://verify.qrv.network/healthz`
  - `registry`: `https://registry.qrv.network/healthz`
  - `api`: `https://api.qrv.network/healthz`
  - `issuer`: `https://issuer.qrv.network/healthz`

## Monitors to configure externally

1. `https://verify.qrv.network/healthz`
2. `https://registry.qrv.network/healthz`
3. `https://api.qrv.network/healthz`
4. `https://issuer.qrv.network/healthz`
5. `https://qrv.network/demo` (public flow smoke monitor)

## Recommended settings

- Interval: 60 seconds.
- Alert threshold: 2 consecutive failures.
- Escalation: pager + Slack `#qrv-launch-war-room`.
- Timeout: 8 seconds.

## Demo verification check

- `https://verify.qrv.network/verify/QRV-DEMO-0001` should return a `VERIFIED` result.
