import { redirect } from 'next/navigation';
import { getAppRole } from '@/lib/app-role';
import { PublicVerifyLanding } from '@/components/verify/PublicVerifyLanding';

export default function HomePage() {
  const role = getAppRole();

  if (role === 'issuer') {
    redirect('/login');
  }

  return <PublicVerifyLanding />;
}
