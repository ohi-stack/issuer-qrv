'use client';

import { useState } from 'react';
import { formatTimestamp, type VerificationRecord } from '@/lib/verification';
import { StatusBadge } from '@/components/verify/StatusBadge';

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="result-row">
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : ''}>{value}</dd>
    </div>
  );
}

export function VerificationResultCard({ record }: { record: VerificationRecord }) {
  const [copied, setCopied] = useState(false);

  async function copyCanonical() {
    await navigator.clipboard.writeText(record.canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="panel-card">
      <header className="result-header">
        <h1>Public Verification Result</h1>
        <StatusBadge status={record.status} />
      </header>

      <dl>
        <Row label="QRVID" value={record.qrvid} mono />
        <Row label="Record Type" value={record.recordType} />
        <Row label="Issuer" value={record.issuer} />
        <Row label="Subject / Holder" value={record.subject} />
        <Row label="Issued" value={formatTimestamp(record.issuedAt)} />
        <Row label="Expires" value={formatTimestamp(record.expiresAt)} />
        <Row label="Hash / Proof" value={record.hash} mono />
        <Row label="Canonical URL" value={record.canonicalUrl} mono />
        <Row label="Checked At" value={formatTimestamp(record.checkedAt)} />
      </dl>

      <button type="button" onClick={copyCanonical}>Copy canonical URL</button>
      {copied ? <p className="ok-text">Copied.</p> : null}
    </section>
  );
}
