import { VerificationStatus } from '@/types/models';

const color: Record<VerificationStatus, { bg: string; fg: string }> = {
  VERIFIED: { bg: '#dcfce7', fg: '#166534' },
  REVOKED: { bg: '#fee2e2', fg: '#991b1b' },
  EXPIRED: { bg: '#fef3c7', fg: '#92400e' },
  NOT_FOUND: { bg: '#e5e7eb', fg: '#374151' },
  DRAFT: { bg: '#dbeafe', fg: '#1e40af' },
  PENDING_SIGNATURE: { bg: '#fef3c7', fg: '#92400e' }
};

export function CertificateStatusBadge({ status }: { status: VerificationStatus }) { const c = color[status]; return <span className="badge" style={{ background: c.bg, color: c.fg }}>{status}</span>; }
