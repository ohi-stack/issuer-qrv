import { AnalyticsSummary, ApiKeyRecord, AuditEvent, CertificateRecord, Issuer, PrivacyLevel, VerificationStatus } from '@/types/models';
import { toVerifyUrl } from '@/lib/runtime-config';

const allowedStatus: VerificationStatus[] = ['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND', 'DRAFT', 'PENDING_SIGNATURE'];
const allowedPrivacy: PrivacyLevel[] = ['PUBLIC', 'RESTRICTED', 'PRIVATE'];

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : fallback);

export function normalizeCertificateRecord(raw: Record<string, unknown>): CertificateRecord {
  const qrvid = str(raw.qrvid || raw.id, 'UNKNOWN-QRVID');
  const statusRaw = str(raw.status, 'NOT_FOUND') as VerificationStatus;

  return {
    id: str(raw.id, qrvid),
    qrvid,
    recordType: 'certificate',
    issuerId: str(raw.issuerId, 'unknown-issuer'),
    issuerName: str(raw.issuerName || raw.issuer, 'Unknown Issuer'),
    recipientName: str(raw.recipientName || raw.subject, 'Unknown Recipient'),
    recipientEmail: typeof raw.recipientEmail === 'string' ? raw.recipientEmail : undefined,
    certificateTitle: str(raw.certificateTitle || raw.title, 'Untitled Certificate'),
    certificateType: typeof raw.certificateType === 'string' ? raw.certificateType : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    issueDate: str(raw.issueDate || raw.createdAt, new Date().toISOString()),
    expirationDate: typeof raw.expirationDate === 'string' ? raw.expirationDate : null,
    privacyLevel: allowedPrivacy.includes(raw.privacyLevel as PrivacyLevel) ? (raw.privacyLevel as PrivacyLevel) : 'PUBLIC',
    status: allowedStatus.includes(statusRaw) ? statusRaw : 'NOT_FOUND',
    verificationUrl: toVerifyUrl(qrvid),
    hash: str(raw.hash),
    signature: typeof raw.signature === 'string' ? raw.signature : undefined,
    verificationCount: num(raw.verificationCount),
    createdAt: str(raw.createdAt, new Date().toISOString()),
    updatedAt: str(raw.updatedAt, new Date().toISOString()),
    revokedAt: typeof raw.revokedAt === 'string' ? raw.revokedAt : null,
    revocationReason: typeof raw.revocationReason === 'string' ? raw.revocationReason : null
  };
}

export const normalizeIssuer = (raw: Record<string, unknown>): Issuer => ({
  id: str(raw.id, 'issuer-unknown'),
  name: str(raw.name || raw.issuerName, 'Unknown Issuer'),
  timezone: str(raw.timezone, 'UTC'),
  organization: str(raw.organization)
});

export const normalizeApiKey = (raw: Record<string, unknown>): ApiKeyRecord => ({
  id: str(raw.id),
  name: str(raw.name, 'API Key'),
  prefix: str(raw.prefix || raw.keyPrefix, 'qrv_'),
  createdAt: str(raw.createdAt, new Date().toISOString()),
  lastUsedAt: typeof raw.lastUsedAt === 'string' ? raw.lastUsedAt : null,
  status: raw.status === 'revoked' ? 'revoked' : 'active'
});

export const normalizeAuditEvent = (raw: Record<string, unknown>): AuditEvent => ({
  id: str(raw.id, `audit-${Date.now()}`),
  actor: str(raw.actor, 'system'),
  action: str(raw.action || raw.eventType, 'UNKNOWN_EVENT'),
  target: str(raw.target || raw.qrvid),
  createdAt: str(raw.createdAt, new Date().toISOString()),
  details: str(raw.details)
});

export const normalizeAnalyticsSummary = (raw: Record<string, unknown>): AnalyticsSummary => ({
  issued: num(raw.issued),
  verified: num(raw.verified),
  revoked: num(raw.revoked),
  expiringSoon: num(raw.expiringSoon)
});
