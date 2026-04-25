import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
