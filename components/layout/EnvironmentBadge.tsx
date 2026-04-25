export function EnvironmentBadge() {
  const env = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
  return <span className="badge" style={{ background: '#e0e7ff', color: '#1e3a8a' }}>{env}</span>;
}
