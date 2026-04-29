import { getAppRole } from '@/lib/app-role';

type VerifyPayload = {
  status?: 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | string;
  issuer?: string;
  recordType?: string;
  credentialTitle?: string;
  issuedDate?: string;
  timestamp?: string;
  hash?: string;
  proofReference?: string;
};

function statusColor(status: string) {
  if (status === 'VERIFIED') return '#15803d';
  if (status === 'REVOKED' || status === 'EXPIRED') return '#b45309';
  return '#b91c1c';
}

export default async function VerifyQrvidPage({ params }: { params: Promise<{ qrvid: string }> }) {
  const role = getAppRole();
  const { qrvid } = await params;

  if (role === 'issuer') {
    return <main style={{ margin: '48px auto', maxWidth: 760 }}>Verification routes are available on verify role deployment.</main>;
  }

  const apiBase = process.env.NEXT_PUBLIC_QRV_API_BASE_URL;
  const endpoint = `${apiBase}/api/v1/verify/${encodeURIComponent(qrvid)}`;

  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) throw new Error('failed');
    const data: VerifyPayload = await res.json();
    const status = ['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND'].includes(data.status || '') ? data.status! : 'NOT_FOUND';

    return (
      <main style={{ maxWidth: 760, margin: '48px auto', fontFamily: 'sans-serif' }}>
        <h1>Verification Result</h1>
        <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 20 }}>
          <p><strong>QRVID:</strong> {qrvid}</p>
          <p><strong>Status:</strong> <span style={{ color: statusColor(status) }}>{status}</span></p>
          {data.issuer && <p><strong>Issuer:</strong> {data.issuer}</p>}
          {data.recordType && <p><strong>Record type:</strong> {data.recordType}</p>}
          {data.credentialTitle && <p><strong>Credential title:</strong> {data.credentialTitle}</p>}
          {data.issuedDate && <p><strong>Issued date:</strong> {data.issuedDate}</p>}
          {data.timestamp && <p><strong>Timestamp:</strong> {data.timestamp}</p>}
          {data.hash && <p><strong>Hash reference:</strong> {data.hash}</p>}
          {data.proofReference && <p><strong>Proof reference:</strong> {data.proofReference}</p>}
        </section>
      </main>
    );
  } catch {
    return (
      <main style={{ maxWidth: 760, margin: '48px auto', fontFamily: 'sans-serif' }}>
        <section style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 12, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Verification service unavailable</h2>
          <p>Please try again shortly. We could not reach the verification API.</p>
        </section>
      </main>
    );
  }
}
