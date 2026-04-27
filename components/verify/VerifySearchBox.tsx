'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { normalizeQrvidInput } from '@/lib/verify-input';

export function VerifySearchBox() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function submit() {
    const normalized = normalizeQrvidInput(input);
    if (!normalized.ok) {
      setError('Enter a valid QRV ID, QRV:// identifier, or verify.qrv.network URL.');
      return;
    }

    setError('');
    router.push(`/verify/${encodeURIComponent(normalized.qrvid)}`);
  }

  return (
    <div className="verify-search" role="search" aria-label="Verify QRV ID">
      <label htmlFor="qrvid">Enter QRV™ ID or URL</label>
      <input
        id="qrvid"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="QRV-123456789"
      />
      {error ? <p className="error-text">{error}</p> : null}
      <div className="actions-row">
        <button type="button" onClick={submit}>Verify</button>
        <Link className="ghost-btn" href="/scan">Scan QR-V Code</Link>
      </div>
    </div>
  );
}
