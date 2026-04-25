import './globals.css';
import { AuthBoundary } from '@/components/auth/AuthBoundary';
import { AppShell } from '@/components/layout/AppShell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'QR-V Issuer Portal' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AuthBoundary><AppShell>{children}</AppShell></AuthBoundary></body></html>;
}
