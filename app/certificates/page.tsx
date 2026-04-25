'use client';
import Link from 'next/link';
import { CertificateTable } from '@/components/certificates/CertificateTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function Certificates(){
  const query = useApiQuery(() => api.getCertificates());
  if (query.loading) return <LoadingState title='Loading certificates…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;

  return <>
    <div style={{display:'flex',justifyContent:'space-between'}}><h1>Certificates</h1><Link className='btn' href='/certificates/new'>New</Link></div>
    {!query.data?.length ? <EmptyState title='No certificates found' /> : <CertificateTable records={query.data} />}
  </>;
}
