import { QRVHeader } from '@/components/verify/QRVHeader';
import { QRVFooter } from '@/components/verify/QRVFooter';

export default function HelpPage() {
  return (
    <main className="public-shell">
      <QRVHeader />
      <section className="panel-card">
        <h1>Help</h1>
        <p>Use this portal to validate QR-V™ records against the registry.</p>
        <ul>
          <li>Accepted input: QRV-*, QRV://*, and https://verify.qrv.network/*.</li>
          <li>NOT_FOUND and INVALID_FORMAT are normal user-facing outcomes.</li>
          <li>UNAVAILABLE indicates a temporary service outage.</li>
        </ul>
      </section>
      <QRVFooter />
    </main>
  );
}
