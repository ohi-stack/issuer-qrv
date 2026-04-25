'use client';
import { MetricCard } from '@/components/analytics/MetricCard';
import { VerificationChart } from '@/components/analytics/VerificationChart';
import { TopRecordsTable } from '@/components/analytics/TopRecordsTable';
import { StatusBreakdown } from '@/components/analytics/StatusBreakdown';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function Analytics(){
  const query = useApiQuery(async () => {
    const [summary, verifs, top] = await Promise.all([api.getAnalyticsSummary(), api.getAnalyticsVerifications(), api.getAnalyticsTopRecords()]);
    return { summary, verifs, top };
  });
  if (query.loading) return <LoadingState title='Loading analytics…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;
  if (!query.data) return <EmptyState title='No analytics data' />;

  const { summary, verifs, top } = query.data;
  return <><div className='grid cols-3'><MetricCard label='Issued' value={summary.issued} /><MetricCard label='Verified' value={summary.verified} /><MetricCard label='Expiring Soon' value={summary.expiringSoon} /></div><VerificationChart points={verifs} /><StatusBreakdown values={{ VERIFIED: summary.verified, REVOKED: summary.revoked, EXPIRED: summary.expiringSoon }} />{top.length ? <TopRecordsTable rows={top} /> : <EmptyState title='No top records yet' />}</>;
}
