'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(process.env.NODE_ENV === 'development');

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setReady(true);
      return;
    }
    if (pathname === '/login') {
      setReady(true);
      return;
    }
    const hasSession = document.cookie.includes('qrv_issuer_session=1');
    if (!hasSession) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
