import Link from 'next/link';
import { Card } from '@/components/shared/ui';

const steps = [
  {
    title: '1) Configure issuer profile',
    detail: 'Set legal issuer name, timezone, support contact, and public metadata for verify.qrv.network.',
    href: '/issuer-profile'
  },
  {
    title: '2) Generate production API key',
    detail: 'Issue a least-privilege key for certificate creation + revocation APIs and store in your backend secret manager.',
    href: '/api-keys'
  },
  {
    title: '3) Issue first live certificate',
    detail: 'Create a public certificate and validate verify.qrv.network/{qrvid} returns VERIFIED before sharing it externally.',
    href: '/certificates/new'
  },
  {
    title: '4) Validate revocation controls',
    detail: 'Run one controlled revoke test and verify REVOKED appears on public verification page.',
    href: '/revocations'
  },
  {
    title: '5) Monitor analytics + audit logs',
    detail: 'Track verification traffic and event logs daily during the first paying issuer onboarding window.',
    href: '/analytics'
  }
];

export default function OnboardingPage() {
  const exitCriteria = [
    'Issuer profile approved with production support contact.',
    'Production API key created and stored in secrets manager.',
    'One live certificate verified publicly as VERIFIED.',
    'One controlled certificate revocation verified publicly as REVOKED.',
    'Monitoring alerts configured for issuer + verify domains.'
  ];

  return <Card>
    <h1>Issuer Onboarding Flow</h1>
    <p>Use this guided flow to activate your first paying issuer inside 7 days.</p>
    <p><strong>Target:</strong> move from signed contract to live verified certificate in 48 hours.</p>
    <div className='grid'>
      {steps.map((step) => <Card key={step.title}>
        <h3>{step.title}</h3>
        <p>{step.detail}</p>
        <Link className='btn' href={step.href}>Open step</Link>
      </Card>)}
    </div>
    <h3>Onboarding Exit Criteria</h3>
    <ul>
      {exitCriteria.map((criteria) => <li key={criteria}>{criteria}</li>)}
    </ul>
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      <Link className='btn' href='/launch-demo'>Launch demo page</Link>
      <Link className='btn secondary' href='/production-checklist'>Production checklist</Link>
    </div>
  </Card>;
}
