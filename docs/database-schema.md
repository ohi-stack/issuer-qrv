# Database Schema

## Audit log table

`{$wpdb->prefix}one_audit_log` stores immutable security and operational events with actor, object, request context, metadata, and timestamp fields.

Future tables must define retention needs, personal data classification, indexes, and audit events before implementation.
