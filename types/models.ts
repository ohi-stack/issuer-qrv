export type VerificationStatus =
  | 'VERIFIED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'NOT_FOUND'
  | 'DRAFT'
  | 'PENDING_SIGNATURE';

export type PublicVerificationStatus = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';

export type PrivacyLevel = 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';

export interface CertificateRecord {
  id: string;
  qrvid: string;
  recordType: 'certificate';
  issuerId: string;
  issuerName: string;
  recipientName: string;
  recipientEmail?: string;
  certificateTitle: string;
  certificateType?: string;
  description?: string;
  issueDate: string;
  expirationDate?: string | null;
  privacyLevel: PrivacyLevel;
  status: VerificationStatus;
  verificationUrl: string;
  hash: string;
  signature?: string;
  verificationCount: number;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

export interface Issuer {
  id: string;
  name: string;
  timezone: 'UTC' | string;
  organization?: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  status: 'active' | 'revoked';
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  details: string;
}

export interface AnalyticsSummary {
  issued: number;
  verified: number;
  revoked: number;
  expiringSoon: number;
}
