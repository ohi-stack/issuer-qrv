import { CertificateRecord } from '@/types/models';
import { Card } from '../shared/ui';
import { CertificateTable } from './CertificateTable';

export function RecentCertificatesTable({ records }: { records: CertificateRecord[] }) {
  return <Card><h3>Recent Certificates</h3><CertificateTable records={records.slice(0,5)} /></Card>;
}
