CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core entities
CREATE TABLE IF NOT EXISTS issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_code text NOT NULL UNIQUE,
  legal_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qrvid text NOT NULL UNIQUE,
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE RESTRICT,
  title text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  CONSTRAINT records_expiry_after_issue CHECK (expires_at IS NULL OR expires_at > issued_at)
);

CREATE TABLE IF NOT EXISTS revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  CONSTRAINT revocations_record_unique UNIQUE (record_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  issuer_id uuid REFERENCES issuers(id) ON DELETE SET NULL,
  record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  actor text NOT NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL UNIQUE REFERENCES issuers(id) ON DELETE CASCADE,
  external_customer_id text UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  CONSTRAINT billing_period_valid CHECK (
    current_period_end IS NULL
    OR current_period_start IS NULL
    OR current_period_end > current_period_start
  )
);

CREATE TABLE IF NOT EXISTS usage_events (
  id bigserial PRIMARY KEY,
  issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

-- Performance indexes (including soft-delete aware partial indexes)
CREATE INDEX IF NOT EXISTS idx_issuers_active ON issuers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_records_issuer_active ON records (issuer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_records_qrvid_active ON records (qrvid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revocations_issuer_active ON revocations (issuer_id, revoked_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_issuer_time ON audit_logs (issuer_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_time ON audit_logs (record_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_issuer_status ON api_keys (issuer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_billing_accounts_status ON billing_accounts (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_issuer_event_at ON usage_events (issuer_id, event_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_type_event_at ON usage_events (event_type, event_at DESC) WHERE deleted_at IS NULL;
