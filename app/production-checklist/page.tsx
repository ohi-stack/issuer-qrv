import { Card } from '@/components/shared/ui';

const checklist = [
  'Run npm run lint, npm run typecheck, npm test, and npm run build for production parity.',
  'Set NEXT_PUBLIC_QRV_API_BASE_URL to https://api.qrv.network in Hostinger env settings.',
  'Confirm issuer.qrv.network routes render via npm start after build.',
  'Create/confirm permanent demo certificate QRV-PROD-CERT-000001 exists and stays PUBLIC.',
  'Open https://verify.qrv.network/QRV-PROD-CERT-000001 and confirm VERIFIED.',
  'Execute revoke flow for a non-demo cert and confirm verify host returns REVOKED.',
  'Ensure onboarding handoff links to API key creation and issuer profile completion.',
  'Freeze launch channel + support owner for first paying issuer within 7 days.'
];

export default function ProductionChecklistPage() {
  return <Card>
    <h1>Production Checklist</h1>
    <p>Deployment environment: <strong>qrv-issuer-production-convergence</strong></p>
    <ol>
      {checklist.map((item) => <li key={item}>{item}</li>)}
    </ol>
  </Card>;
}
