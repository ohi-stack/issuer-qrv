# QR-V Issuer Portal (Starter)

Minimal Node.js starter for the QR-V Issuer service.

## Core routes

- `/dashboard` — issuer metrics + launch readiness.
- `/onboarding` — first paying issuer onboarding flow.
- `/production-checklist` — deployment and go-live checklist.
- `/launch-demo` — live demo run-of-show and outreach links.
- `/certificates` — certificate inventory.
- `/certificates/new` — issue certificate wizard.
- `/revocations` — revoke and confirm public REVOKED state.

## Run locally

npm install
npm start

## Smoke commands

- `npm run smoke:e2e` (API + verify flow)
- `npm run smoke:external` (live domain route + verify checks)
