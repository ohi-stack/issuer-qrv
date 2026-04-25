# QRV Uptime Monitoring Setup

## Monitors to configure
1. `https://issuer.qrv.network/dashboard` (issuer portal availability)
2. `https://issuer.qrv.network/onboarding` (onboarding path)
3. `https://issuer.qrv.network/production-checklist` (go-live checklist)
4. `https://verify.qrv.network/verify/QRV-PROD-CERT-000001` (expected status: VERIFIED)
5. `https://verify.qrv.network/verify/QRV-PROD-CERT-000002` (expected status: REVOKED)

## Recommended settings
- Interval: 60 seconds for verify host, 120 seconds for issuer portal.
- Alert threshold: 2 consecutive failures.
- Escalation: pager + Slack #qrv-launch-war-room.
- Timeouts: 8 seconds max.

## SLA target this week
- 99.9% uptime during pilot onboarding window.
- Mean time to acknowledge incidents: < 5 minutes.
