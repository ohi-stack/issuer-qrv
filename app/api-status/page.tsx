import { QRVHeader } from '@/components/verify/QRVHeader';
import { QRVFooter } from '@/components/verify/QRVFooter';

const API_BASE = process.env.NEXT_PUBLIC_QRV_API_BASE ?? 'https://api.qrv.network';

export default function ApiStatusPage() {
  return (
    <main className="public-shell">
      <QRVHeader />
      <section className="panel-card">
        <h1>API Status</h1>
        <p>Verification API endpoint:</p>
        <p className="mono">{API_BASE}/verify/:qrvid</p>
        <p>Status checks are executed server-side on every verification request.</p>
      </section>
      <QRVFooter />
    </main>
  );
}
