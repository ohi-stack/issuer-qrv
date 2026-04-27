import { QRVHeader } from '@/components/verify/QRVHeader';
import { VerifySearchBox } from '@/components/verify/VerifySearchBox';
import { TrustExplainer } from '@/components/verify/TrustExplainer';
import { IssuerCTA } from '@/components/verify/IssuerCTA';
import { QRVFooter } from '@/components/verify/QRVFooter';

export function PublicVerifyLanding() {
  return (
    <main className="public-shell">
      <QRVHeader />
      <section className="hero-block">
        <p className="eyebrow">Registry-backed public verification</p>
        <h1>Verify Any QR-V™ Record Instantly</h1>
        <p>
          Enter a QRVID, QRV:// identifier, or verify URL to resolve the current record status from
          the QR-V™ Global Verification Network.
        </p>
        <VerifySearchBox />
      </section>
      <TrustExplainer />
      <IssuerCTA />
      <QRVFooter />
    </main>
  );
}
