# QR-V™ Issuer Control Plane — WordPress v1

The production v1 issuer experience is being consolidated into a WordPress plugin rather than a separate public issuer application.

## Production architecture

- Public website and verification UI: `https://qrv.network`
- Public API: `https://api.qrv.network`
- Canonical datastore: PostgreSQL QR-V registry
- Issuer control plane: QR-V WordPress plugin

## Public verification URL

```text
https://qrv.network/verify/{qrvid}
```

The public verification page calls:

```text
GET https://api.qrv.network/verify/{qrvid}
```

## WordPress plugin responsibilities

The plugin should provide these administrator screens:

```text
QR-V
├── Dashboard
├── Issue Certificate
├── Certificates
├── Revocations
├── API Settings
├── Verification Logs
└── Help / Quickstart
```

The plugin is a control-plane client only. It must not become the canonical source of truth.

Allowed local convenience data includes WordPress post ID, QRVID, issuer name, certificate title, recipient, verification URL, created date, and last-sync date. Authoritative lifecycle state must always be read from `api.qrv.network`.

## API contract used by the plugin

```http
GET  https://api.qrv.network/health
GET  https://api.qrv.network/verify/{qrvid}
POST https://api.qrv.network/certificates
GET  https://api.qrv.network/certificates
POST https://api.qrv.network/certificates/{qrvid}/revoke
GET  https://api.qrv.network/audit/{qrvid}
```

## Certificate issuance fields

```text
recipient
title
issuer
issueDate
expirationDate
metadata
```

The backend generates the QRVID, canonical hash/signature material, persists the record, and returns the public verification URL.

## Deterministic verification states

```text
VERIFIED
REVOKED
EXPIRED
NOT_FOUND
```

## Repository status

The existing Next.js issuer application is retained only as migration/reference material while the WordPress plugin becomes the supported v1 issuer control plane.

### Deferred from v1

- standalone `issuer.qrv.network`
- standalone `verify.qrv.network`
- standalone `registry.qrv.network`
- standalone `docs.qrv.network`
- standalone `developers.qrv.network`
- standalone `explorer.qrv.network`
- scanner application
- SDKs
- federated nodes
- blockchain registry

## Pilot lifecycle

1. Configure plugin with `https://api.qrv.network` and an issuer API key.
2. Issue a certificate from WordPress.
3. Persist authoritative record in PostgreSQL through the API.
4. Generate QR code for `https://qrv.network/verify/{qrvid}`.
5. Verify through the public API.
6. Revoke through the WordPress plugin.
7. Reverify and require `REVOKED`.

