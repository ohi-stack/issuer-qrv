'use client';
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function IssuerProfile(){
  const query = useApiQuery(() => api.getIssuerMe());
  if (query.loading) return <LoadingState title='Loading issuer profile…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;
  if (!query.data) return <EmptyState title='Issuer not found' />;
  const me = query.data;
  return <Card><h1>Issuer Profile</h1><p>{me.name}</p><p className='mono'>{me.id}</p><p>Time standard: Gregorian UTC ({me.timezone})</p></Card>;
}
