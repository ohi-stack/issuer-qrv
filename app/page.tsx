import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isIssuerRole } from '@/lib/app-role';

export default function HomePage() {
  if (isIssuerRole()) {
    redirect('/login');
  }

  return (
    <main className="page-wrap">
      <section className="verify-card hero-card">
        <p className="eyebrow">QRV Public Verification</p>
        <h1>Trust every credential before you rely on it.</h1>
        <p className="hero-copy">
          Open a verification URL in the format <span className="mono">/your-qrvid</span> to view
          issuer, ownership, hash, and status details directly from the QRV registry.
        </p>
        <Link href="/QRV-PROD-CERT-000001" className="primary-link" prefetch={false}>
          Try sample route
        </Link>
      </section>
    </main>
  );
}
