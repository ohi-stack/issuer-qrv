# qrv-verify (Express production service)

Pure Express service for Hostinger Express preset deployments.

## Routes

- `/`
- `/healthz`
- `/readyz`
- `/version`
- `/api/v1/verify/:qrvid`
- `/verify/:qrvid`
- `/:qrvid`

## Scripts

- `npm run start` → `node server.js`
- `npm run build` → `echo "no build step"`
- `npm run dev` → `node server.js`

## Deploy (Hostinger)

Use the **Express** preset.

- Build command: `npm run build`
- Start command: `npm run start`

## Local run

```bash
npm install
npm run dev
```
