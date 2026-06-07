# QR-V V1 Smoke Tests

> Replace `BASE_URL` with the deployed host and `ISSUER_TOKEN` with a valid issuer credential.

## 0) Domain ownership/content-type smoke test
```bash
npm run smoke:domains
```

Expected:
- `api.qrv.network` and `registry.qrv.network` respond with `Content-Type: application/json...`
- `issuer.qrv.network` and `verify.qrv.network` respond with `Content-Type: text/html...`

## 1) Health
```bash
curl -sS "$BASE_URL/health"
```

## 2) Create record (auth required)
```bash
curl -sS -X POST "$BASE_URL/api/v1/registry/create" \
  -H "Authorization: Bearer $ISSUER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"V1 Smoke Cert","subject":"Smoke Subject","issuer":"QR-V"}'
```

## 3) Verify seed record
```bash
curl -sS "$BASE_URL/api/v1/verify/QRV-PROD-CERT-000001"
```

## 4) Revoke record (auth required)
```bash
curl -sS -X POST "$BASE_URL/api/v1/revoke" \
  -H "Authorization: Bearer $ISSUER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrvid":"QRV-PROD-CERT-000001"}'
```

## 5) Verify revoked record
```bash
curl -sS "$BASE_URL/api/v1/verify/QRV-PROD-CERT-000001"
```

## Production root hub and service-domain smoke checks

Run the production smoke script after Hostinger deployment:

```bash
npm run smoke:production
```

Default targets:

- `https://qrv.network`
- `https://qrv.network/status`
- `https://api.qrv.network/healthz`
- `https://verify.qrv.network/QRV-DEMO-001`
- `https://issuer.qrv.network/login`

Optional environment overrides:

- `QRV_ROOT_URL`
- `QRV_STATUS_PAGE_URL`
- `QRV_API_HEALTHZ_URL`
- `QRV_VERIFY_DEMO_URL`
- `QRV_ISSUER_LOGIN_URL`
