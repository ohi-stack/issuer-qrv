import Link from 'next/link';
import { Card } from '@/components/shared/ui';

const runOfShow = [
  'Open /dashboard and show Pilot Launch Readiness > 95%.',
  'Open verified demo certificate: verify.qrv.network/QRV-PROD-CERT-000001.',
  'Open revoked demo certificate: verify.qrv.network/QRV-PROD-CERT-000002.',
  'Issue a new sample certificate from /certificates/new.',
  'Revoke sample from /revocations and refresh verify page to show REVOKED.',
  'Close with onboarding timeline for first paying issuer in 7 days.'
];

const materials = [
  { label: 'Production checklist', href: '/production-checklist' },
  { label: 'Issuer onboarding flow', href: '/onboarding' },
  { label: 'Outreach script + email templates', href: '/pilot-launch-outreach-kit.md' }
];

export default function LaunchDemoPage() {
  return <Card>
    <h1>Launch Demo Page</h1>
    <p>Use this page during sales + implementation calls to convert the first paying pilot issuer.</p>
    <h3>Live Demo Run-of-Show</h3>
    <ol>
      {runOfShow.map((step) => <li key={step}>{step}</li>)}
    </ol>
    <h3>Demo Links</h3>
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      <Link className='btn secondary' href='https://verify.qrv.network/QRV-PROD-CERT-000001' target='_blank'>Open VERIFIED demo cert</Link>
      <Link className='btn secondary' href='https://verify.qrv.network/QRV-PROD-CERT-000002' target='_blank'>Open REVOKED demo cert</Link>
      <Link className='btn secondary' href='/dashboard'>Open dashboard</Link>
    </div>
    <h3>Outreach Materials</h3>
    <ul>
      {materials.map((item) => <li key={item.label}><Link href={item.href}>{item.label}</Link></li>)}
    </ul>
  </Card>;
}
