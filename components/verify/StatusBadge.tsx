import type { VerificationStatus } from '@/lib/verification';

const styles: Record<VerificationStatus, string> = {
  VERIFIED: 'status-ok',
  REVOKED: 'status-bad',
  EXPIRED: 'status-bad',
  NOT_FOUND: 'status-warn',
  INVALID_FORMAT: 'status-warn',
  UNAVAILABLE: 'status-muted',
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return <span className={`status-badge ${styles[status]}`}>{status}</span>;
}
