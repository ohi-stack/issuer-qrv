import { Card } from '@/components/shared/ui';

const checklist = [
  'Merge current production-routes PR into the release branch.',
  'Deploy issuer portal to live domains: issuer.qrv.network + verify.qrv.network dependencies.',
  'Run npm run lint, npm run typecheck, npm test, and npm run build for production parity.',
  'Set NEXT_PUBLIC_QRV_API_BASE_URL to https://api.qrv.network in Hostinger env settings.',
  'Run external smoke tests for /dashboard, /onboarding, /production-checklist, and /launch-demo.',
  'Create/confirm permanent demo certificate QRV-PROD-CERT-000001 exists and stays PUBLIC.',
  'Create/confirm permanent revoked demo certificate QRV-PROD-CERT-000002 stays REVOKED.',
  'Open https://verify.qrv.network/QRV-PROD-CERT-000001 and confirm VERIFIED.',
  'Open https://verify.qrv.network/QRV-PROD-CERT-000002 and confirm REVOKED.',
  'Enable uptime monitoring with 60-120s checks for issuer + verify hosts.',
  'Ensure onboarding handoff links to API key creation and issuer profile completion.',
  'Publish launch demo page and outreach kit for first paying issuer within 7 days.'
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
