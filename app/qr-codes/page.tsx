'use client';
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { toVerifyUrl } from '@/lib/runtime-config';
import { useApiQuery } from '@/lib/use-api-query';

export default function QrCodes(){
  const query = useApiQuery(() => api.getCertificates());
  if (query.loading) return <LoadingState title='Loading QR records…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;
  if (!query.data?.length) return <EmptyState title='No QR records found' />;
  return <Card><h1>QR Codes</h1><p>QR encodes only verify URLs.</p>{query.data.map(c=><p className='mono' key={c.id}>{toVerifyUrl(c.qrvid)}</p>)}</Card>;
}
