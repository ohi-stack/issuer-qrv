# QR-V™ Issuer Portal

Authenticated issuer control plane for the QR-V™ Global Verification Network.

## Repository Integrity Notice

This repository currently contains package metadata and source material associated with an unrelated One Companion WordPress plugin. That content does not match the repository name, service boundary, deployment target, or QR-V production architecture.

**Do not deploy the current `main` branch to `issuer.qrv.network` until the incorrect source tree is removed or the last known-good issuer application is restored.**

The current mismatch is a production blocker, not a cosmetic issue.

## Intended Service

`issuer.qrv.network` must allow approved organizations to:

- authenticate securely;
- create registry-backed QR-V records;
- issue verifiable certificates;
- generate PNG and SVG QR codes;
- manage record lifecycle and revocation;
- view verification analytics;
- manage API keys and team roles;
- review billing and plan entitlements;
- access audit history and support.

## Canonical Lifecycle

```text
issuer login
→ create certificate
→ generate QRVID
→ canonicalize payload
→ SHA-256 hash
→ Ed25519 sign
→ persist to registry
→ generate QR
→ public VERIFIED result
→ revoke
→ public REVOKED result
```

## Required Routes

```text
/login
/dashboard
/records
/records/new
/records/:qrvid
/certificates
/certificates/new
/qr-codes
/revocations
/analytics
/api-keys
/team
/billing
/settings
/support
```

## Required Dashboard Metrics

- total records issued;
- active records;
- revoked records;
- expired records;
- total verifications;
- verifications today;
- top verified records.

## Canonical Production Integration

```text
Issuer Portal: https://issuer.qrv.network
API: https://api.qrv.network/api/v1
Public Verifier: https://verify.qrv.network
Registry: https://registry.qrv.network
Canonical Demo: QRV-PROD-CERT-000001
```

## Security Requirements

- JWT or secure server-side session authentication;
- role-based authorization;
- strict production CORS allowlist;
- no database access from the browser;
- no signing private keys in client code or source control;
- issuer-scoped API keys;
- idempotency keys for issuance;
- audit logging for login, create, update, export, and revoke;
- safe unavailable states when upstream services fail;
- no exposure of restricted or private record data.

## Recovery Procedure

1. Identify the last known-good QR-V issuer portal commit, branch, artifact, or repository.
2. Preserve the current unrelated source in a separate repository if it belongs to another project.
3. Restore the issuer application to an isolated recovery branch.
4. Confirm the package name, scripts, framework, and deployment entrypoint match `issuer-qrv`.
5. Run dependency, secret, and repository-family audits.
6. Validate API configuration against `api.qrv.network`.
7. Complete certificate issue → QR → verify → revoke acceptance testing.
8. Merge only after the branch passes production checks.
9. Redeploy `issuer.qrv.network` from the corrected commit.

## Production Definition of Done

The issuer portal is complete only when an approved issuer can create a certificate, receive a QRVID, download a QR code, verify the record publicly, revoke it without direct database access, and observe the public result change to `REVOKED` with a complete audit trail.

Track recovery and production lifecycle work in Issue #70.
