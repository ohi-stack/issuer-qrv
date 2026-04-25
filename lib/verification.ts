export type VerifyStatus = 'VERIFIED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | 'ERROR';

export type VerificationRecord = {
  status: VerifyStatus;
  issuer: string;
  recordType: string;
  owner: string;
  createdDate: string;
  hash: string;
  qrvid: string;
};

const REGISTRY_BASE_URL = 'https://registry.qrv.network/verify';

function asText(value: unknown, fallback = 'Unavailable') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export async function fetchVerification(qrvid: string): Promise<VerificationRecord> {
  const encodedQrvid = encodeURIComponent(qrvid.trim());

  try {
    const response = await fetch(`${REGISTRY_BASE_URL}/${encodedQrvid}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      return {
        status: 'NOT_FOUND',
        issuer: 'Unavailable',
        recordType: 'Unavailable',
        owner: 'Unavailable',
        createdDate: 'Unavailable',
        hash: 'Unavailable',
        qrvid,
      };
    }

    if (!response.ok) {
      return {
        status: 'ERROR',
        issuer: 'Unavailable',
        recordType: 'Unavailable',
        owner: 'Unavailable',
        createdDate: 'Unavailable',
        hash: 'Unavailable',
        qrvid,
      };
    }

    const data: Record<string, unknown> = await response.json();
    const rawStatus = asText(data.status, 'ERROR').toUpperCase();
    const status: VerifyStatus =
      rawStatus === 'VERIFIED' || rawStatus === 'REVOKED' || rawStatus === 'EXPIRED'
        ? rawStatus
        : 'ERROR';

    return {
      status,
      issuer: asText(data.issuer),
      recordType: asText(data.recordType ?? data.record_type),
      owner: asText(data.owner),
      createdDate: asText(data.createdDate ?? data.created_at),
      hash: asText(data.hash),
      qrvid: asText(data.qrvid, qrvid),
    };
  } catch {
    return {
      status: 'ERROR',
      issuer: 'Unavailable',
      recordType: 'Unavailable',
      owner: 'Unavailable',
      createdDate: 'Unavailable',
      hash: 'Unavailable',
      qrvid,
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
