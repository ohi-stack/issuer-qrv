import Link from 'next/link';

export function QRVHeader() {
  return (
    <header className="qrv-header">
      <Link href="/" className="brand-mark">
        QR-V™
      </Link>
      <nav aria-label="Primary">
        <ul className="header-links">
          <li><Link href="/">Verify</Link></li>
          <li><Link href="/scan">Scan</Link></li>
          <li><Link href="/help">Help</Link></li>
          <li><a href="https://issuer.qrv.network">Issuer Access</a></li>
        </ul>
      </nav>
    </header>
  );
}
