# QR-V V1 Smoke Tests

> Replace `BASE_URL` with the deployed host and `ISSUER_TOKEN` with a valid issuer credential.

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
