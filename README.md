# QR-V™ Issuer Portal — Consolidated Source Archive

The QR-V Issuer Portal is now being consolidated into the primary platform application.

## Canonical production route

```text
https://qrv.network/issuer
https://qrv.network/issuer/dashboard
https://qrv.network/issuer/records
```

The active public platform repository is:

```text
ohi-stack/qrv-node
```

The canonical backend is:

```text
ohi-stack/qrv-api
https://api.qrv.network
```

## Repository status

This repository remains important as the richer Next.js issuer implementation and migration source. It should not be treated as the required production deployment after two-node cutover.

Preserve it for:

- issuer UX and component migration;
- multi-user authentication work;
- billing and analytics UI patterns;
- richer dashboard modules;
- historical production issuer work.

## Legacy compatibility

If `issuer.qrv.network` remains in DNS, point it to the same `qrv-node` deployment. The platform redirects it to `https://qrv.network/issuer`.

## Production lifecycle

The consolidated platform must preserve:

```text
issuer login
→ create record
→ generate QRVID
→ generate QR
→ public VERIFIED result
→ revoke
→ public REVOKED result
```

Do not delete this repository until the richer issuer capabilities required for commercial launch have been migrated or intentionally retired.
