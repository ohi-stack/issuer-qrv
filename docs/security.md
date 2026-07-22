# Security Notes

## Private-data rule

The repository must never contain real employee, client, health, payroll, background-check, or transportation records. Development fixtures must be fictional and safe to publish within a private source repository.

## WordPress controls

- Every admin surface must check a plugin-specific capability.
- Every state-changing request must verify a nonce.
- All output must be escaped with WordPress escaping helpers.
- All input must be sanitized and validated before storage.
- Audit events should avoid storing sensitive payloads and should retain only operational metadata.

## Current capability model

- `one_companion_manage_plugin`
- `one_companion_view_dashboard`
- `one_companion_manage_time_clock`
- `one_companion_view_audit_log`
# Security Model

## Principles

- Least-privilege roles and explicit capabilities.
- Capability checks before every sensitive action.
- Sanitized input and escaped output.
- Audit logging for authentication, authorization, employment, client-service, and data export events.
- No time clock, client records, or transportation modules until schema, permission, and audit requirements are approved.
