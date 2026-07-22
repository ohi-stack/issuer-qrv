# Production Checklist

Before production release:

- Confirm no real operational records are committed.
- Run PHP syntax checks and automated tests.
- Review all admin actions for nonce checks and capability checks.
- Confirm database migrations are idempotent.
- Confirm uninstall behavior is intentionally conservative and documented.
- Confirm audit logs omit sensitive data.
- Validate WordPress and PHP version compatibility.
- Test activation, deactivation, and uninstall on a staging site.
- [ ] Review and approve roles and capabilities.
- [ ] Review audit log event taxonomy and retention policy.
- [ ] Verify database migrations in staging.
- [ ] Complete threat model for employee and client data.
- [ ] Confirm backup and restore procedures.
- [ ] Configure error logging without exposing sensitive data.
- [ ] Run PHP linting and automated tests.
- [ ] Confirm no sensitive modules ship before security approval.
