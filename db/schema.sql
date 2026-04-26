CREATE SEQUENCE IF NOT EXISTS registry_qrvid_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS registry_records (
  qrvid text PRIMARY KEY,
  title text NOT NULL,
  subject text NOT NULL,
  issuer text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  certificate_version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS registry_audit_log (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO registry_records (qrvid, title, subject, issuer, status, certificate_version)
VALUES (
  'QRV-PROD-CERT-000001',
  'QR-V Production Seed Certificate',
  'QR-V Production Test Subject',
  'QR-V Production Issuer',
  'active',
  1
)
ON CONFLICT (qrvid) DO NOTHING;
