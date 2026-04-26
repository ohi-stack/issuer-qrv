# Environment Variables

## Required
- `NODE_ENV` (`production` in production)
- `PORT` (Hostinger-assigned process port)
- `HOST_ROLE` (`issuer`, `api`, or `verify`)
- `DATABASE_URL` (PostgreSQL connection string)
- `SIGNING_SECRET` (record signing secret)
- `ISSUER_TOKEN` (issuer API key bearer value)
- `JWT_SECRET` (HS256 secret for issuer JWT auth)
- `ADMIN_TOKEN` (admin bearer token for privileged metrics/admin routes)

## Optional
- `APP_BASE_URL` (defaults to `https://issuer.qrv.network`)
- `ISSUER_LOGIN_PATH` (defaults to `/login`)
- `RATE_LIMIT_WINDOW_MS` (defaults to `60000`)
- `RATE_LIMIT_MAX` (defaults to `100`)
- `PGSSLMODE` (`disable` for local plaintext; otherwise SSL enabled)
