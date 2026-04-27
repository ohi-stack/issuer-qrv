import { QRVHeader } from '@/components/verify/QRVHeader';
import { QRVFooter } from '@/components/verify/QRVFooter';
import { VerificationResultCard } from '@/components/verify/VerificationResultCard';
import type { VerificationRecord } from '@/lib/verification';

export function VerifyView({ record }: { record: VerificationRecord }) {
  return (
    <main className="public-shell">
      <QRVHeader />
      <VerificationResultCard record={record} />
      <QRVFooter />
    </main>
  );
}
