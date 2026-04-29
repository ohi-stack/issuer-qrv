'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function PublicVerifyLanding() {
  const [qrvid, setQrvid] = useState('');
  const router = useRouter();

  const onOpen = () => {
    const trimmed = qrvid.trim();
    if (!trimmed) return;
    router.push(`/${encodeURIComponent(trimmed)}`);
  };

  return (
    <main style={{ maxWidth: 680, margin: '48px auto', fontFamily: 'sans-serif' }}>
      <h1>QRV Public Verification</h1>
      <p>Trust every credential before you rely on it.</p>
      <label htmlFor="qrvid">Enter a QRVID field</label>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <input id="qrvid" value={qrvid} onChange={(e) => setQrvid(e.target.value)} placeholder="QRV-PROD-CERT-000001" style={{ flex: 1, padding: 10 }} />
        <button onClick={onOpen} style={{ padding: '10px 16px' }}>Open</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <Link href="/QRV-PROD-CERT-000001">Try sample route: /QRV-PROD-CERT-000001</Link>
      </div>
    </main>
  );
}
