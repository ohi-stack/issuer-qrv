'use client';
import { MetricCard } from '@/components/analytics/MetricCard';
import { RegistryHealthCard } from '@/components/analytics/RegistryHealthCard';
import { RecentCertificatesTable } from '@/components/certificates/RecentCertificatesTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
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
  return <>
    <div className='grid cols-3'>
      <MetricCard label='Issued' value={summary.issued} />
      <MetricCard label='Verified' value={summary.verified} />
      <MetricCard label='Revoked' value={summary.revoked} />
    </div>
    <RegistryHealthCard />
    {certs.length ? <RecentCertificatesTable records={certs} /> : <EmptyState title='No certificates yet' description='Issue your first certificate to populate dashboard activity.' />}
  </>;
}
