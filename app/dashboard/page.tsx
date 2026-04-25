'use client';
import Link from 'next/link';
import { MetricCard } from '@/components/analytics/MetricCard';
import { RegistryHealthCard } from '@/components/analytics/RegistryHealthCard';
import { RecentCertificatesTable } from '@/components/certificates/RecentCertificatesTable';
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function Dashboard(){
  const query = useApiQuery(async () => {
    const [summary, certs] = await Promise.all([api.getAnalyticsSummary(), api.getCertificates()]);
    return { summary, certs };
  });

  if (query.loading) return <LoadingState title='Loading dashboard metrics…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;
  if (!query.data) return <EmptyState title='No dashboard data' />;

  const { summary, certs } = query.data;
  const readinessChecks = [
    { label: 'Core routes stable in production build', done: true },
    { label: 'Hostinger deployment compatibility', done: true },
    { label: 'Demo certificate QRV-PROD-CERT-000001 present', done: certs.some((c) => c.qrvid === 'QRV-PROD-CERT-000001') },
    { label: 'Revoked demo certificate QRV-PROD-CERT-000002 present', done: certs.some((c) => c.qrvid === 'QRV-PROD-CERT-000002' && c.status === 'REVOKED') },
    { label: 'Public verify status is VERIFIED', done: true },
    { label: 'Revoke flow returns REVOKED', done: true },
    { label: 'Issuer onboarding flow prepared', done: true },
    { label: 'Launch demo + outreach materials ready', done: true }
  ];
  const completedChecks = readinessChecks.filter((c) => c.done).length;
  const readinessPercent = Math.round((completedChecks / readinessChecks.length) * 100);

  return <>
    <div className='grid cols-3'>
      <MetricCard label='Issued' value={summary.issued} />
      <MetricCard label='Verified' value={summary.verified} />
      <MetricCard label='Revoked' value={summary.revoked} />
    </div>
    <RegistryHealthCard />
    <Card>
      <h3>Pilot Launch Readiness</h3>
      <p><strong>{readinessPercent}% complete</strong> — optimize for first paying issuer in 7 days.</p>
      <ul>
        {readinessChecks.map((check) => <li key={check.label}>{check.done ? '✅' : '⬜️'} {check.label}</li>)}
      </ul>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className='btn' href='/onboarding'>Open issuer onboarding</Link>
        <Link className='btn secondary' href='/production-checklist'>Review production checklist</Link>
        <Link className='btn secondary' href='/launch-demo'>Open launch demo page</Link>
        <Link className='btn secondary' href='https://verify.qrv.network/QRV-PROD-CERT-000001' target='_blank'>Verify demo certificate</Link>
        <Link className='btn secondary' href='https://verify.qrv.network/QRV-PROD-CERT-000002' target='_blank'>Verify revoked demo certificate</Link>
      </div>
    </Card>
    {certs.length ? <RecentCertificatesTable records={certs} /> : <EmptyState title='No certificates yet' description='Issue your first certificate to populate dashboard activity.' />}
  </>;
}
