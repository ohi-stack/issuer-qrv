import Link from 'next/link';
import { CertificateRecord } from '@/types/models';
import { DataTable } from '../shared/ui';
import { CertificateStatusBadge } from './CertificateStatusBadge';

export function CertificateTable({ records }: { records: CertificateRecord[] }) {
  return <DataTable columns={['QRVID','Recipient','Certificate','Status','Verifications']} rows={records.map((r)=><tr key={r.id}><td className="mono"><Link href={`/certificates/${r.qrvid}`}>{r.qrvid}</Link></td><td>{r.recipientName}</td><td>{r.certificateTitle}</td><td><CertificateStatusBadge status={r.status} /></td><td>{r.verificationCount}</td></tr>)} />;
}
