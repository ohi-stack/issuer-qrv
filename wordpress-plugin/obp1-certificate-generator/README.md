# OBP-1 Certificate Generator

## Installation
1. Copy `obp1-certificate-generator` into `wp-content/plugins/`.
2. Activate plugin in WordPress admin.
3. Ensure WooCommerce is active.
4. Configure issuer details in **OBP1 Certificates → Settings**.

## Configuration
- Add product-level certificate metadata in WooCommerce product edit:
  - Certificate Type
  - Certificate Title
- Certificates are generated on order completion.

## Routes / Shortcodes
- Verification route: `/verify-certificate/{verification_slug}`
- Shortcodes:
  - `[obp1_verify_certificate]`
  - `[obp1_certificate_dashboard]`

## REST API
Namespace: `/wp-json/obp1/v1`
- `GET /verify/{serial}` (public)
- `GET /certificates` (admin)
- `GET /certificates/{id}` (admin)
- `POST /certificates` (admin)
- `POST /certificates/{id}/revoke` (admin)
- `POST /certificates/{id}/reissue` (admin)
- `GET /templates` (admin)
- `POST /templates` (admin)

## Security controls
- Capability checks for admin routes and menus.
- Input sanitization and escaped output.
- Prepared SQL in read/write query paths.
- Public verification output excludes private fields.

## Testing checklist
1. Activate plugin and confirm tables are created.
2. Set product certificate type/title.
3. Complete WooCommerce order and confirm order note.
4. Confirm certificate, QR image, and HTML/PDF artifact exist in uploads.
5. Open verification URL and verify non-private fields only.
6. Verify user dashboard lists the certificate.
7. Test REST endpoints with admin and non-admin users.
8. Revoke and reissue via REST and confirm audit events.
