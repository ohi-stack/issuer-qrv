import Link from 'next/link';

const items = ['/dashboard','/onboarding','/production-checklist','/certificates','/qr-codes','/analytics','/revocations','/issuer-profile','/api-keys','/audit-logs','/settings'];
export function Sidebar(){
  return <aside className="sidebar"><h3>QR-V Issuer</h3><nav className="grid">{items.map((i)=><Link key={i} href={i}>{i.replace('/','').replace('-',' ')}</Link>)}</nav></aside>;
}
