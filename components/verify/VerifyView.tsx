import Image from 'next/image';
import type { VerificationRecord, VerifyStatus } from '@/lib/verification';
import { formatDate } from '@/lib/verification';

const STATUS_LABELS: Record<VerifyStatus, { text: string; className: string; message: string }> = {
  VERIFIED: {
    text: 'VERIFIED',
    className: 'status-verified',
    message: 'This credential is valid and active in the registry.',
  },
  REVOKED: {
    text: 'REVOKED',
    className: 'status-revoked',
    message: 'This credential was revoked and should not be accepted.',
  },
  EXPIRED: {
    text: 'EXPIRED',
    className: 'status-expired',
    message: 'This credential has expired and is no longer valid.',
  },
  NOT_FOUND: {
    text: 'NOT_FOUND',
    className: 'status-not-found',
    message: 'No matching registry record was found for this QRVID.',
  },
};

type Props = {
  record: VerificationRecord;
};

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <article className="data-field">
      <p className="field-label">{label}</p>
      <p className={mono ? 'field-value mono' : 'field-value'}>{value}</p>
    </article>
  );
}

export function VerifyView({ record }: Props) {
  const status = STATUS_LABELS[record.status];

  return (
    <main className="page-wrap">
      <section className="verify-card">
        <header className="verify-header">
          <p className="eyebrow">QRV Registry Verification</p>
          <span className={`status-badge ${status.className}`}>{status.text}</span>
        </header>
        <p className="status-message">{status.message}</p>

        <section className="issuer-row" aria-label="issuer profile">
          {record.issuerLogoUrl ? (
            <Image
              className="issuer-logo"
              src={record.issuerLogoUrl}
              alt={`${record.issuerName} logo`}
              width={42}
              height={42}
              unoptimized
            />
          ) : null}
          <Field label="Issuer" value={record.issuerName} />
        </section>

        <section className="fields-grid" aria-label="verification details">
          <Field label="Credential Title" value={record.credentialTitle} />
          <Field label="Subject" value={record.subjectDisplay} />
          <Field label="Issued Date" value={formatDate(record.issuedAt)} />
          <Field label="Verification Timestamp" value={formatDate(record.verifiedAt)} />
          <Field label="Hash / Proof Reference" value={record.proofReference} mono />
          <Field label="QRVID" value={record.qrvid} mono />
        </section>
      </section>
    </main>
  );
}
