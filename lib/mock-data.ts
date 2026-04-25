import { ApiKeyRecord, AuditEvent, CertificateRecord } from '@/types/models';

const now = new Date().toISOString();
export const mockCertificates: CertificateRecord[] = [
  { id:'1', qrvid:'QRV-CERT-2026-0001', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Academy', recipientName:'Ava Lee', recipientEmail:'ava@example.com', certificateTitle:'Compliance Fundamentals', certificateType:'Completion', description:'Training cert', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'VERIFIED', verificationUrl:'https://verify.qrv.network/QRV-CERT-2026-0001', hash:'a4e9b2', signature:'sig-1', verificationCount:12, createdAt:now, updatedAt:now },
  { id:'2', qrvid:'QRV-CERT-2026-0002', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Academy', recipientName:'Noah Kim', certificateTitle:'Safety Essentials', issueDate:now, expirationDate:null, privacyLevel:'RESTRICTED', status:'REVOKED', verificationUrl:'https://verify.qrv.network/QRV-CERT-2026-0002', hash:'b6c2d1', verificationCount:2, createdAt:now, updatedAt:now, revokedAt:now, revocationReason:'Issued in error' }
];

export const mockApiKeys: ApiKeyRecord[] = [{id:'k1',name:'Prod Integration',prefix:'qrv_live_9f3',createdAt:now,status:'active',lastUsedAt:now}];
export const mockAudit: AuditEvent[] = [{id:'a1',actor:'admin@issuer.org',action:'CERTIFICATE_ISSUED',target:'QRV-CERT-2026-0001',createdAt:now,details:'Registry-backed issuance completed'}];

export const mockAnalytics = {
  summary: { issued: 1240, verified: 1180, revoked: 9, expiringSoon: 21 },
  verifications: [{date:'2026-04-20',count:220},{date:'2026-04-21',count:241},{date:'2026-04-22',count:199}],
  topRecords: mockCertificates.map((c) => ({ qrvid:c.qrvid, count:c.verificationCount, recipient:c.recipientName }))
};
