import { QRV_API_BASE_URL, QRV_VERIFY_BASE_URL } from '@/lib/runtime-config';
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
  if (value === 'VERIFIED' || value === 'REVOKED' || value === 'EXPIRED' || value === 'NOT_FOUND') {
    return value;
  }

  return 'UNAVAILABLE';
}

function canonicalFor(qrvid: string): string {
  return `${QRV_VERIFY_BASE_URL}/verify/${encodeURIComponent(qrvid)}`;
}

function unavailableRecord(
  qrvid: string,
  status: Extract<VerificationStatus, 'NOT_FOUND' | 'UNAVAILABLE'>,
  checkedAt: string,
): VerificationRecord {
  return {
    ...DEFAULTS,
    qrvid,
    status,
    checkedAt,
    canonicalUrl: canonicalFor(qrvid),
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
    const response = await fetch(`${QRV_API_BASE_URL}/verify/${encodeURIComponent(qrvid)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return unavailableRecord(qrvid, 'NOT_FOUND', checkedAt);
    }

    if (!response.ok) {
      return unavailableRecord(qrvid, 'UNAVAILABLE', checkedAt);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const data =
      typeof payload.data === 'object' && payload.data !== null
        ? (payload.data as Record<string, unknown>)
        : payload;

    return {
      qrvid: safeText(data.qrvid, qrvid),
      status: normalizeStatus(data.status),
      recordType: safeText(data.recordType ?? data.record_type ?? data.type),
      issuer: safeText(data.issuer ?? data.issuerName),
      subject: safeText(data.subject ?? data.subjectDisplay ?? data.recipientName),
      issuedAt: safeText(data.issuedAt ?? data.issueDate ?? data.created_at),
      expiresAt:
        typeof data.expiresAt === 'string'
          ? safeText(data.expiresAt)
          : typeof data.expirationDate === 'string'
            ? safeText(data.expirationDate)
            : null,
      hash: safeText(data.hash ?? data.proofReference),
      canonicalUrl: safeText(data.canonicalUrl, canonicalFor(qrvid)),
      checkedAt: safeText(data.checkedAt, checkedAt),
    };
  } catch {
    return unavailableRecord(qrvid, 'UNAVAILABLE', checkedAt);
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
