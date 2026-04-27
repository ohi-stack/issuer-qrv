import { QRVHeader } from '@/components/verify/QRVHeader';

export default function LoadingVerifyPage() {
  return (
    <main className="public-shell">
      <QRVHeader />
      <section className="panel-card" aria-busy="true" aria-live="polite">
        <h1>Checking registry record…</h1>
        <p>Please wait while we resolve this QRVID.</p>
      </section>
    </main>
  );
}
