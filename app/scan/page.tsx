import { QRVHeader } from '@/components/verify/QRVHeader';
import { QRScannerPanel } from '@/components/verify/QRScannerPanel';
import { QRVFooter } from '@/components/verify/QRVFooter';

export default function ScanPage() {
  return (
    <main className="public-shell">
      <QRVHeader />
      <QRScannerPanel />
      <QRVFooter />
    </main>
  );
}
