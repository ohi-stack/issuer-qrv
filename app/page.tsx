import { redirect } from 'next/navigation';
import { getAppRole } from '@/lib/app-role';

export default function HomePage() {
  const role = getAppRole();

  if (role === 'issuer') {
    redirect('/login');
  }

  return (
    <main className="page-wrap">
      <section className="verify-card hero-card">
        <p className="eyebrow">QRV Public Verification</p>
        <h1>Trust every credential before you rely on it.</h1>
      </section>
    </main>
  );
import { PublicVerifyLanding } from '@/components/verify/PublicVerifyLanding';
import { isIssuerRole } from '@/lib/app-role';

export default function HomePage() {
  if (isIssuerRole()) {
    redirect('/login');
  }

  return <PublicVerifyLanding />;
}
