import { redirect } from 'next/navigation';
import { PublicVerifyLanding } from '@/components/verify/PublicVerifyLanding';
import { getAppRole } from '@/lib/app-role';

export default function HomePage() {
  const role = getAppRole();

  if (role === 'issuer') {
    redirect('/login');
  }

  return <PublicVerifyLanding />;
}
