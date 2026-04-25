'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function PublicVerifyLanding() {
  const [qrvid, setQrvid] = useState('');
  const router = useRouter();

  function handleOpenQrvid() {
    const trimmedQrvid = qrvid.trim();
    if (!trimmedQrvid) {
      return;
    }
    router.push(`/${encodeURIComponent(trimmedQrvid)}`);
  }

  return (
    <main className="page-wrap">
      <section className="verify-card hero-card">
        <p className="eyebrow">QRV Public Verification</p>
        <h1>Trust every credential before you rely on it.</h1>
        <p className="hero-copy">Enter a QRVID to check its public verification status.</p>

        <div className="verify-search" role="search" aria-label="QRVID verification">
          <label htmlFor="qrvid" className="field-label">
            Enter a QRVID
          </label>
          <input
            id="qrvid"
            className="verify-input"
            placeholder="QRV-PROD-CERT-000001"
            value={qrvid}
            onChange={(event) => setQrvid(event.target.value)}
          />
          <button type="button" className="primary-link" onClick={handleOpenQrvid}>
            Open verification route
          </button>
        </div>

        <Link href="/QRV-PROD-CERT-000001" className="secondary-link" prefetch={false}>
          Try sample route: /QRV-PROD-CERT-000001
        </Link>
      </section>
    </main>
  );
}
