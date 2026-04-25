'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CertificateDetail } from '@/components/certificates/CertificateDetail';
import { QRDownloadPanel } from '@/components/certificates/QRDownloadPanel';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function CertDetail(){
  const params = useParams<{ qrvid: string }>();
  const qrvid = params?.qrvid || "";
  const query = useApiQuery(() => api.getCertificate(qrvid));

  if (query.loading) return <LoadingState title='Loading certificate details…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;
  if (!query.data) return <EmptyState title='Certificate not found' />;

  const verificationUrl = `https://verify.qrv.network/${query.data.qrvid}`;
  return <>
    <CertificateDetail record={query.data} />
    <QRDownloadPanel qrvid={query.data.qrvid} />
    <Link className='btn' href={verificationUrl} target='_blank'>Open Public Verification</Link>
  </>;
}
