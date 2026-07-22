# One Companion Plugin Architecture

## Purpose

One Companion Plugin is a private WordPress plugin foundation for operational workflows. The initial release intentionally stores only source code, configuration examples, documentation, and fictional fixtures.

## Implementation order

1. Bootstrap file
2. Activation and deactivation lifecycle
3. Roles and capabilities
4. Database migration framework
5. Audit logging
6. Admin settings screen
7. Employee dashboard shell
8. Time clock MVP
9. Training integration
10. Client and applicant portals

## Current components

- `one-companion-plugin.php` bootstraps constants, class loading, lifecycle hooks, and plugin startup.
- `includes/class-activator.php` installs roles, capabilities, and database migrations.
- `includes/class-deactivator.php` handles safe shutdown tasks.
- `includes/class-loader.php` centralizes WordPress hook registration.
- `includes/class-plugin.php` owns migrations, audit logging, and the first admin dashboard shell.
- `includes/class-roles.php` and `includes/class-capabilities.php` define access control.

## Data boundaries

Do not commit real employee, client, health, payroll, background-check, or transportation records. Use only fictional fixtures and clearly marked examples.
# Architecture

The plugin is organized around a WordPress bootstrap, service classes in `includes/`, scoped admin/public surfaces, REST API endpoints, database migrations, and templates.

Sensitive modules remain placeholders until the authorization and audit model is finalized.
