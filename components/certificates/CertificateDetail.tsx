'use client';
import { CertificateRecord } from '@/types/models';
import { Button, Card } from '../shared/ui';
import { CertificateStatusBadge } from './CertificateStatusBadge';
import { QRCodePreview } from './QRCodePreview';
import { VerificationUrlCopy } from './VerificationUrlCopy';

export function CertificateDetail({ record }: { record: CertificateRecord }) {
  const verificationUrl = `https://verify.qrv.network/${record.qrvid}`;
  return <div className="grid"><Card><h2>{record.certificateTitle}</h2><p className="mono">QRVID: {record.qrvid}</p><Button className='secondary' onClick={() => navigator.clipboard.writeText(record.qrvid)}>Copy QRVID</Button><CertificateStatusBadge status={record.status} /><p>Registry: registry.qrv.network</p><p className="mono">Hash: {record.hash || 'N/A'}</p><p className="mono">Signature: {record.signature || 'N/A'}</p><p>Issue Date (UTC): {record.issueDate}</p><p>Created At (UTC): {record.createdAt}</p><p>Updated At (UTC): {record.updatedAt}</p>{record.revokedAt && <p>Revoked At (UTC): {record.revokedAt}</p>}{record.revocationReason && <p>Revocation Reason: {record.revocationReason}</p>}<VerificationUrlCopy url={verificationUrl} /></Card><QRCodePreview qrvid={record.qrvid} /><Card><h3>Audit & Verification</h3><p>Verification Count: {record.verificationCount}</p><p>Latest status transitions are recorded in audit logs.</p></Card></div>;
}
