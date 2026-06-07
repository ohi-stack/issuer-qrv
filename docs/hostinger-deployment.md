# Hostinger Production Deployment: qrv.network

Use these exact Hostinger settings for the `qrv.network` Express root command hub.

```text
Framework: Express
Entry file: server.js
Node: 20.x
PORT=3000
```

| Setting | Value |
| --- | --- |
| Framework | `Express` |
| Entry file | `server.js` |
| Node | `20.x` |
| Environment variable | `PORT=3000` |

## Required commands

```bash
npm ci
npm run check
npm run build
npm start
```

## Production route coverage

The root hub must serve production content for:

- `https://qrv.network/`
- `https://qrv.network/verify`
- `https://qrv.network/issuer`
- `https://qrv.network/docs`
- `https://qrv.network/developers`
- `https://qrv.network/pricing`
- `https://qrv.network/status`
- `https://qrv.network/store`
- `https://qrv.network/network`

## Service-domain smoke targets

After deployment, run smoke checks against:

- `https://qrv.network`
- `https://qrv.network/status`
- `https://api.qrv.network/healthz`
- `https://verify.qrv.network/QRV-DEMO-001`
- `https://issuer.qrv.network/login`
