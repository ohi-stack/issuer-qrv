import { QRV_API_BASE_URL } from '@/lib/runtime-config';

export type VerifyStatus = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';
import { normalizeQrvidInput } from '@/lib/verify-input';

export type VerificationStatus =
  | 'VERIFIED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'UNAVAILABLE';

export type VerificationRecord = {
  qrvid: string;
  status: VerificationStatus;
  recordType: string;
  issuer: string;
  subject: string;
  issuedAt: string;
  expiresAt: string | null;
  hash: string;
  canonicalUrl: string;
  checkedAt: string;
};

const VERIFY_API_BASE_URL = QRV_API_BASE_URL;
const API_BASE = process.env.NEXT_PUBLIC_QRV_API_BASE ?? 'https://api.qrv.network';

const DEFAULTS: Omit<VerificationRecord, 'qrvid' | 'status' | 'checkedAt'> = {
  recordType: 'Unavailable',
  issuer: 'Unavailable',
  subject: 'Unavailable',
  issuedAt: 'Unavailable',
  expiresAt: null,
  hash: 'Unavailable',
  canonicalUrl: 'Unavailable',
};

function safeText(value: unknown, fallback = 'Unavailable'): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return cleaned || fallback;
}

function normalizeStatus(raw: unknown): VerificationStatus {
  const value = safeText(raw, 'UNAVAILABLE').toUpperCase();
  if (['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND'].includes(value)) {
    return value as VerificationStatus;
  }
  return 'UNAVAILABLE';
}

function canonicalFor(qrvid: string): string {
  return `https://verify.qrv.network/verify/${encodeURIComponent(qrvid)}`;
}

function getUnavailableRecord(qrvid: string, verifiedAt: string): VerificationRecord {
  return {
    status: 'NOT_FOUND',
    issuerName: 'Unavailable',
    credentialTitle: 'Unavailable',
    subjectDisplay: 'Unavailable',
    issuedAt: 'Unavailable',
    verifiedAt,
    proofReference: 'Unavailable',
    qrvid,
    apiUnavailable: true,
  };
}
export async function resolveVerification(rawInput: string): Promise<VerificationRecord> {
  const checkedAt = new Date().toISOString();
  const normalized = normalizeQrvidInput(rawInput);

  if (!normalized.ok) {
    return {
      ...DEFAULTS,
      qrvid: rawInput.trim() || 'Unknown',
      status: 'INVALID_FORMAT',
      checkedAt,
      canonicalUrl: 'Unavailable',
    };
  }

  const qrvid = normalized.qrvid;

  try {
    const response = await fetch(`${API_BASE}/verify/${encodeURIComponent(qrvid)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return getUnavailableRecord(qrvid, verifiedAt);
    }

    const rawJson = (await response.json()) as Record<string, unknown>;
    const data = typeof rawJson.data === 'object' && rawJson.data ? (rawJson.data as Record<string, unknown>) : rawJson;

    return {
      status: normalizeStatus(data.status),
      issuerName: asText(data.issuerName ?? data.issuer),
      issuerLogoUrl: typeof data.issuerLogoUrl === 'string' ? data.issuerLogoUrl : undefined,
      recordType: asText(data.recordType ?? data.record_type ?? data.type),
      credentialTitle: asText(data.credentialTitle ?? data.title),
      subjectDisplay: asText(data.subjectDisplay ?? data.recipientName ?? data.subject),
      issuedAt: asText(data.issuedAt ?? data.issueDate ?? data.created_at),
      verifiedAt,
      proofReference: deriveProofReference(data),
      qrvid: asText(data.qrvid, qrvid),
    };
  } catch {
    return getUnavailableRecord(qrvid, verifiedAt);
  }
}

export function formatDate(rawDate: string): string {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;

    });

    if (response.status === 404) {
      return {
        ...DEFAULTS,
        qrvid,
        status: 'NOT_FOUND',
        checkedAt,
        canonicalUrl: canonicalFor(qrvid),
      };
    }

    if (!response.ok) {
      return {
        ...DEFAULTS,
        qrvid,
        status: 'UNAVAILABLE',
        checkedAt,
        canonicalUrl: canonicalFor(qrvid),
      };
    }

    const payload = (await response.json()) as Record<string, unknown>;

    return {
      qrvid,
      status: normalizeStatus(payload.status),
      recordType: safeText(payload.recordType),
      issuer: safeText(payload.issuer),
      subject: safeText(payload.subject),
      issuedAt: safeText(payload.issuedAt),
      expiresAt: typeof payload.expiresAt === 'string' ? safeText(payload.expiresAt) : null,
      hash: safeText(payload.hash),
      canonicalUrl: safeText(payload.canonicalUrl, canonicalFor(qrvid)),
      checkedAt: safeText(payload.checkedAt, checkedAt),
    };
  } catch {
    return {
      ...DEFAULTS,
      qrvid,
      status: 'UNAVAILABLE',
      checkedAt,
      canonicalUrl: canonicalFor(qrvid),
    };
  }
}

export function formatTimestamp(value: string | null): string {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(parsed);
}

export const fetchVerification = resolveVerification;
