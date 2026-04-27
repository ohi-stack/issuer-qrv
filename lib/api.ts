import { mockAnalytics, mockApiKeys, mockAudit, mockCertificates } from '@/lib/mock-data';
import { normalizeAnalyticsSummary, normalizeApiKey, normalizeAuditEvent, normalizeCertificateRecord, normalizeIssuer } from '@/lib/normalize';
import { AnalyticsSummary, ApiKeyRecord, AuditEvent, CertificateRecord, Issuer } from '@/types/models';

import { QRV_API_BASE_URL } from '@/lib/runtime-config';

const API_BASE = QRV_API_BASE_URL;
const allowMockFallback = process.env.NODE_ENV === 'development';

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

type AnyObj = Record<string, unknown>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store'
  });

  if (!res.ok) {
    let message = `API request failed (${res.status})`;
    try {
      const body = await res.json() as { error?: string; message?: string };
      message = body?.error || body?.message || message;
    } catch {
      // no-op
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

async function withMock<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (allowMockFallback) return fallback;
    throw error;
  }
}

export interface CreateCertificatePayload {
  certificateTitle: string;
  certificateType?: string;
  credentialCategory?: string;
  description?: string;
  issueDate: string;
  expirationDate?: string | null;
  internalCertificateId?: string;
  tags?: string[];
  recipientName: string;
  recipientEmail?: string;
  recipientOrganization?: string;
  recipientIdentifier?: string;
  privacyLevel: 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
  qrvidPrefix?: string;
  hashAlgorithm?: 'SHA-256';
  issuerDisplay?: string;
  registryTarget?: string;
}

export const api = {
  getHealth: () => withMock(() => request<{ status?: string; api?: string; registry?: string }>('/health'), { api: 'ok', registry: 'ok' }),

  getIssuerMe: () => withMock(async () => normalizeIssuer(await request<AnyObj>('/issuer/me')), normalizeIssuer({ id: 'iss-1', name: 'QRV Academy', timezone: 'UTC' })),
  patchIssuerMe: async (body: Partial<Issuer>) => normalizeIssuer(await request<AnyObj>('/issuer/me', { method: 'PATCH', body: JSON.stringify(body) })),

  getCertificates: () => withMock(async () => (await request<AnyObj[]>('/certificates')).map(normalizeCertificateRecord), mockCertificates),
  postCertificate: (payload: CreateCertificatePayload) => withMock(async () => normalizeCertificateRecord(await request<AnyObj>('/certificates', { method: 'POST', body: JSON.stringify(payload) })), mockCertificates[0]),
  getCertificate: (qrvid: string) => withMock(async () => normalizeCertificateRecord(await request<AnyObj>(`/certificates/${encodeURIComponent(qrvid)}`)), mockCertificates.find((c) => c.qrvid === qrvid) ?? mockCertificates[0]),
  patchCertificate: async (qrvid: string, body: Partial<CertificateRecord>) => normalizeCertificateRecord(await request<AnyObj>(`/certificates/${encodeURIComponent(qrvid)}`, { method: 'PATCH', body: JSON.stringify(body) })),
  revokeCertificate: async (qrvid: string, reason: string) => normalizeCertificateRecord(await request<AnyObj>(`/certificates/${encodeURIComponent(qrvid)}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) })),
  getCertificateQr: (qrvid: string) => request<{ qrCodeDataUrl?: string; url?: string }>(`/certificates/${encodeURIComponent(qrvid)}/qr`),
  getProofReport: (qrvid: string) => request<{ url?: string }>(`/certificates/${encodeURIComponent(qrvid)}/proof-report`),

  getAnalyticsSummary: () => withMock(async () => normalizeAnalyticsSummary(await request<AnyObj>('/analytics/summary')), mockAnalytics.summary),
  getAnalyticsVerifications: () => withMock(() => request<Array<{ date: string; count: number }>>('/analytics/verifications'), mockAnalytics.verifications),
  getAnalyticsTopRecords: () => withMock(() => request<Array<{ qrvid: string; recipient: string; count: number }>>('/analytics/top-records'), mockAnalytics.topRecords),

  getApiKeys: () => withMock(async () => (await request<AnyObj[]>('/api-keys')).map(normalizeApiKey), mockApiKeys),
  postApiKey: async (name: string) => normalizeApiKey(await request<AnyObj>('/api-keys', { method: 'POST', body: JSON.stringify({ name }) })),
  rotateApiKey: async (id: string) => normalizeApiKey(await request<AnyObj>(`/api-keys/${encodeURIComponent(id)}/rotate`, { method: 'POST' })),
  deleteApiKey: (id: string) => request<void>(`/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getAuditLogs: () => withMock(async () => (await request<AnyObj[]>('/audit-logs')).map(normalizeAuditEvent), mockAudit)
};

export type { AnalyticsSummary, ApiKeyRecord, AuditEvent, CertificateRecord, Issuer };
