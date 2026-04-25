import { render, screen } from '@testing-library/react';
import React from 'react';

import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';
import CertificatesPage from '@/app/certificates/page';
import NewCertificatePage from '@/app/certificates/new/page';
import CertificateDetailPage from '@/app/certificates/[qrvid]/page';
import QrCodesPage from '@/app/qr-codes/page';
import AnalyticsPage from '@/app/analytics/page';
import RevocationsPage from '@/app/revocations/page';
import IssuerProfilePage from '@/app/issuer-profile/page';
import ApiKeysPage from '@/app/api-keys/page';
import AuditLogsPage from '@/app/audit-logs/page';
import SettingsPage from '@/app/settings/page';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/dashboard',
  useParams: () => ({ qrvid: 'QRV-CERT-2026-0001' })
}));

vi.mock('@/lib/use-api-query', () => ({
  useApiQuery: () => ({ loading: true, error: null, data: null, retry: vi.fn() })
}));

describe('route smoke tests', () => {
  it('renders /login', () => {
    render(<LoginPage />);
    expect(screen.getByText('Issuer Login')).toBeInTheDocument();
  });

  const loadingRoutes: Array<[string, React.ComponentType]> = [
    ['/dashboard', DashboardPage],
    ['/certificates', CertificatesPage],
    ['/certificates/[qrvid]', CertificateDetailPage],
    ['/qr-codes', QrCodesPage],
    ['/analytics', AnalyticsPage],
    ['/revocations', RevocationsPage],
    ['/issuer-profile', IssuerProfilePage],
    ['/api-keys', ApiKeysPage],
    ['/audit-logs', AuditLogsPage]
  ];

  it.each(loadingRoutes)('renders %s loading state', (_route: string, Component: React.ComponentType) => {
    render(<Component />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders /certificates/new wizard shell', () => {
    render(<NewCertificatePage />);
    expect(screen.getByText('Issue Certificate Wizard')).toBeInTheDocument();
  });

  it('renders /settings', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
