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
