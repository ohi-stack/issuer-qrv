import Link from 'next/link';
import { ApiHealthIndicator, RegistryHealthIndicator } from './HealthIndicators';
import { EnvironmentBadge } from './EnvironmentBadge';

export function Topbar() {
  return <header className="topbar">
    <div style={{display:'flex',gap:8,alignItems:'center'}}><EnvironmentBadge /><ApiHealthIndicator /><RegistryHealthIndicator /></div>
    <Link className="btn" href="/certificates/new">Issue Certificate</Link>
  </header>;
}
