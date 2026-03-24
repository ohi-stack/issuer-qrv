# QR-V Issuer Portal UI Implementation Brief

## Purpose
The Issuer Portal is the controlled record-creation interface for `issuer.qrv.network`.

It is a UI/workflow layer only.

It must:
- collect issuer input
- call the authoritative API
- display returned QRVID and verification URL
- generate a QR code for the returned verification URL

It must not:
- store records locally as a source of truth
- implement registry logic
- implement database logic
- act as the public verification portal

## System Boundary

```text
issuer.qrv.network (UI)
    ↓
api.qrv.network (authoritative API)
    ↓
qrv-registry / PostgreSQL
```

The public verification experience belongs to `verify.qrv.network`, not this repo.

## Current Repo Reality
The repository currently contains a minimal Express starter with:
- in-memory record creation at `/records`
- local verification route at `/verify/:id`
- QR code generation against `issuer.qrv.network/verify/:id`

That is not the intended production architecture.

## Required Direction

### Phase 1 — Create Record UI
Build the first production-aligned issuer flow around record creation.

Required page:
- `/create`

Required fields:
- `recordType` (required)
- `subject` (required)
- `description` (optional but recommended)
- `metadata` (optional JSON textarea)
- `expiresAt` (optional datetime)

Required behavior:
1. Validate required fields.
2. Submit a `POST` request to the external API.
3. Receive the created record response.
4. Display the returned QRVID, verify URL, timestamp, and QR code.

## API Contract
The portal should be designed against this contract.

### Request
`POST {API_BASE_URL}/registry/create`

Example payload:

```json
{
  "recordType": "certificate",
  "subject": "John Doe",
  "description": "Completion of QR-V onboarding",
  "metadata": {
    "course": "QR-V System",
    "cohort": "2026-03"
  },
  "expiresAt": null
}
```

### Success Response

```json
{
  "status": "CREATED",
  "qrvid": "QRV-ABC123XYZ789",
  "verifyUrl": "https://verify.qrv.network/QRV-ABC123XYZ789",
  "hash": "sha256:...",
  "timestamp": "2026-03-23T00:00:00Z"
}
```

### Error Behavior
The portal must render deterministic error states for:
- validation failure
- malformed metadata JSON
- upstream API unavailable
- unexpected response shape

## UI Requirements

### Create Page
The `/create` page should include:
- page title: `Create QR-V Record`
- issuer context header
- form card
- loading state on submit
- inline validation messages
- disabled submit button while request is in flight

### Success State
After successful creation, show:
- `Status: CREATED`
- QRVID
- verify URL
- QR code image
- copy button for QRVID
- copy button for verify URL
- link to open the public verification page

### Mobile Behavior
The form and success view must remain usable on mobile widths.

## Environmental Configuration
Add external configuration support:

- `API_BASE_URL`
- `PUBLIC_VERIFY_BASE_URL`

Recommended values:

```env
API_BASE_URL=https://api.qrv.network
PUBLIC_VERIFY_BASE_URL=https://verify.qrv.network
```

## Required Refactor Notes
The current in-memory record logic should be treated as temporary starter logic only.

Production direction should be:
- external API submission instead of local record creation
- verify links pointed at `verify.qrv.network`, not `issuer.qrv.network`
- local verification route removed or clearly marked as non-authoritative if retained during transition

## Recommended Next Tasks
1. Add `/create` page/UI.
2. Add external API client helper.
3. Add request validation + metadata JSON parsing.
4. Add QR code generation for returned verify URL.
5. Replace local verify URL generation with `verify.qrv.network/{qrvid}`.
6. Add a simple dashboard page listing recently created records from API responses or later from a real API listing endpoint.
7. Add issuer authentication once create flow is stable.

## Codex Prompt Seed
Use this as the next constrained build instruction:

```txt
Build the QR-V Issuer Portal record-creation UI in this repository.

Important architectural rules:
- This repo is the issuer portal UI/workflow layer.
- Do not implement database logic.
- Do not implement registry logic.
- Do not use local in-memory storage as the source of truth.
- Do not generate verify links on issuer.qrv.network.
- Verification links must point to verify.qrv.network.

Task:
1. Add a /create route or page.
2. Build a form with fields: recordType, subject, description, metadata, expiresAt.
3. Validate required fields and metadata JSON.
4. Submit POST requests to {API_BASE_URL}/registry/create.
5. Render success state with qrvid, verifyUrl, timestamp, hash, and QR code.
6. Add loading and error states.
7. Keep the UI clean, mobile-friendly, and production-oriented.
```
