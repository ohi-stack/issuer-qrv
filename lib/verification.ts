export type VerifyStatus = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';

export type VerificationRecord = {
  status: VerifyStatus;
  issuerName: string;
  issuerLogoUrl?: string;
  recordType?: string;
  credentialTitle: string;
  subjectDisplay: string;
  issuedAt: string;
  verifiedAt: string;
  proofReference: string;
  qrvid: string;
  apiUnavailable?: boolean;
};

const VERIFY_API_BASE_URL = process.env.NEXT_PUBLIC_QRV_API_BASE_URL ?? 'https://api.qrv.network';

function asText(value: unknown, fallback = 'Unavailable') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeStatus(rawValue: unknown): VerifyStatus {
  const rawStatus = asText(rawValue, 'NOT_FOUND').toUpperCase();
  if (rawStatus === 'VERIFIED' || rawStatus === 'REVOKED' || rawStatus === 'EXPIRED') {
    return rawStatus;
  }
  return 'NOT_FOUND';
}

function deriveProofReference(data: Record<string, unknown>) {
  return asText(data.hash ?? data.proofReference ?? data.proof_reference, 'Unavailable');
}

export async function fetchVerification(qrvid: string): Promise<VerificationRecord> {
  const encodedQrvid = encodeURIComponent(qrvid.trim());
  const verifiedAt = new Date().toISOString();

  try {
    const response = await fetch(`${VERIFY_API_BASE_URL}/api/v1/verify/${encodedQrvid}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      return {
        status: 'NOT_FOUND',
        issuerName: 'Unavailable',
        recordType: 'Unavailable',
        credentialTitle: 'Unavailable',
        subjectDisplay: 'Unavailable',
        issuedAt: 'Unavailable',
        verifiedAt,
        proofReference: 'Unavailable',
        qrvid,
      };
    }

    if (!response.ok) {
      return {
        status: 'NOT_FOUND',
        issuerName: 'Unavailable',
        recordType: 'Unavailable',
        credentialTitle: 'Unavailable',
        subjectDisplay: 'Unavailable',
        issuedAt: 'Unavailable',
        verifiedAt,
        proofReference: 'Unavailable',
        qrvid,
        apiUnavailable: true,
      };
    }

    const data: Record<string, unknown> = await response.json();
    const issuerLogoUrl =
      typeof data.issuerLogoUrl === 'string'
        ? data.issuerLogoUrl
        : typeof data.issuer_logo_url === 'string'
          ? data.issuer_logo_url
          : undefined;

    return {
      status: normalizeStatus(data.status),
      issuerName: asText(data.issuerName ?? data.issuer),
      issuerLogoUrl,
      recordType: asText(data.recordType ?? data.record_type ?? data.type),
      credentialTitle: asText(data.credentialTitle ?? data.title),
      subjectDisplay: asText(data.subjectDisplay ?? data.recipientName ?? data.subject),
      issuedAt: asText(data.issuedAt ?? data.issueDate ?? data.created_at),
      verifiedAt,
      proofReference: deriveProofReference(data),
      qrvid: asText(data.qrvid, qrvid),
    };
  } catch {
    return {
      status: 'NOT_FOUND',
      issuerName: 'Unavailable',
      recordType: 'Unavailable',
      credentialTitle: 'Unavailable',
      subjectDisplay: 'Unavailable',
      issuedAt: 'Unavailable',
      verifiedAt,
      proofReference: 'Unavailable',
      qrvid,
      apiUnavailable: true,
    };
  }
}

export function formatDate(rawDate: string): string {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }

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
