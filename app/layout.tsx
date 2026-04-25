import type { Metadata } from 'next';
import './globals.css';
import { getAppRole } from '@/lib/app-role';

const appRole = getAppRole();

const metadataByRole: Record<string, Metadata> = {
  issuer: {
    metadataBase: new URL('https://issuer.qrv.network'),
    title: {
      default: 'QRV Issuer Portal | Credential Operations',
      template: '%s | QRV Issuer Portal',
    },
    description:
      'Manage credential issuance, revocations, analytics, API keys, and issuer settings from the QRV control plane.',
    applicationName: 'QRV Issuer Portal',
    keywords: ['QRV', 'issuer portal', 'credential issuance', 'revocation management'],
    openGraph: {
      title: 'QRV Issuer Portal',
      description: 'Issuer control plane for managing verifiable credentials.',
      url: 'https://issuer.qrv.network',
      siteName: 'QRV Issuer Portal',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'QRV Issuer Portal',
      description: 'Issue and manage credentials with full lifecycle controls.',
    },
    robots: {
      index: false,
      follow: false,
    },
  },
  verify: {
    metadataBase: new URL('https://verify.qrv.network'),
    title: {
      default: 'QRV Verify | Trusted Credential Verification',
      template: '%s | QRV Verify',
    },
    description:
      'Verify QRV credentials instantly with tamper-evident registry checks. Trusted verification for issuers, owners, and relying parties.',
    applicationName: 'QRV Verify',
    keywords: ['QRV', 'credential verification', 'digital certificate', 'registry verification'],
    openGraph: {
      title: 'QRV Verify',
      description: 'Public verification portal for QRV credential records.',
      url: 'https://verify.qrv.network',
      siteName: 'QRV Verify',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'QRV Verify',
      description: 'Check credential integrity and status in seconds.',
    },
    robots: {
      index: true,
      follow: true,
    },
  },
};

export const metadata: Metadata = metadataByRole[appRole] || metadataByRole.issuer;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
