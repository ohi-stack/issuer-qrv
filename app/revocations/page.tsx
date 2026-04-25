'use client';
import Link from 'next/link';
import { useState } from 'react';
import { RevokeCertificateForm } from '@/components/certificates/RevokeCertificateForm';
import { RevocationConfirmModal } from '@/components/certificates/RevocationConfirmModal';
import { CertificateStatusBadge } from '@/components/certificates/CertificateStatusBadge';
import { EmptyState, ErrorState, LoadingState, Select } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function Revocations(){
  const certsQuery = useApiQuery(() => api.getCertificates());
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (certsQuery.loading) return <LoadingState title='Loading certificates for revocation…' />;
  if (certsQuery.error) return <ErrorState message={`API unavailable: ${certsQuery.error}`} onRetry={certsQuery.retry} />;
  if (!certsQuery.data?.length) return <EmptyState title='No certificates available to revoke' />;

  const current = certsQuery.data.find((c) => c.qrvid === selected) ?? certsQuery.data[0];

  return <>
    <h1>Revocations</h1>
    <label>Select certificate
      <Select value={current.qrvid} onChange={(e) => setSelected(e.target.value)}>
        {certsQuery.data.map((c) => <option key={c.qrvid} value={c.qrvid}>{c.qrvid} — {c.certificateTitle}</option>)}
      </Select>
    </label>
    <RevokeCertificateForm reason={reason} setReason={setReason} onRevoke={()=>setOpen(true)} />
    <RevocationConfirmModal open={open} qrvid={current.qrvid} onClose={()=>setOpen(false)} onConfirm={async ()=>{
      try {
        setError(null);
        const revoked = await api.revokeCertificate(current.qrvid, reason);
        setResult(revoked);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Revocation failed');
      }
    }} />

    {error && <ErrorState message={error} />}
    {result && <>
      <p>Latest action status: <CertificateStatusBadge status='REVOKED' /></p>
      <p>revokedAt: {result.revokedAt || new Date().toISOString()}</p>
      <p>revocationReason: {result.revocationReason || reason}</p>
      <Link className='btn' href={`https://verify.qrv.network/${result.qrvid}`} target='_blank'>Open Public Verification</Link>
    </>}
  </>;
}
