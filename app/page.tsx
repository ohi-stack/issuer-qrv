import { redirect } from 'next/navigation';
import { PublicVerifyLanding } from '@/components/verify/PublicVerifyLanding';
import { isIssuerRole } from '@/lib/app-role';

export default function HomePage() {
  if (isIssuerRole()) {
    redirect('/login');
  }

  return <PublicVerifyLanding />;
}
