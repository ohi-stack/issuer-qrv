# QR-V™ Issuer Portal — Consolidated Source Archive

The QR-V Issuer Portal is consolidated into the primary platform application.

## Canonical production routes

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

## 30-day commercial role

The issuer experience is the primary operational surface for the **QR-V™ Verified Certificate Pilot**.

Do not expand this source archive into another production deployment. Migrate only the capabilities needed to get paying issuers live.

Required commercial lifecycle:

```text
approved issuer
→ entitlement confirmed
→ create certificate record
→ generate QRVID
→ generate/download QR
→ public VERIFIED result
→ view verification activity
→ revoke / expire record
→ public REVOKED / EXPIRED result
```

## Minimum issuer dashboard

Show:

- issuer identity and approval state;
- plan / pilot package;
- onboarding status;
- total records;
- active records;
- revoked records;
- expired records;
- total verifications;
- recent verification activity;
- signing status;
- API credential state;
- billing / entitlement state.

## Minimum issuance form

Support:

- record type;
- certificate / credential title;
- subject / recipient;
- description;
- issue date;
- expiration date;
- privacy level;
- issuer metadata;
- optional external reference;
- canonical QR-V identifier returned by the API.

The platform must not claim Ed25519 issuer signing is active until the production API actually signs and verifies records end-to-end.

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

## Revenue validation metric

The primary success metric is not issuer signups alone. It is:

```text
paying third-party issuers
→ production records issued
→ independent verifications
→ recurring revenue
```

Do not delete this repository until the richer issuer capabilities required for commercial launch have been migrated or intentionally retired.
