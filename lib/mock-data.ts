import { ApiKeyRecord, AuditEvent, CertificateRecord } from '@/types/models';

const now = new Date().toISOString();
export const mockCertificates: CertificateRecord[] = [
  { id:'1', qrvid:'QRV-PROD-CERT-000001', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Academy', recipientName:'Pilot Demo Holder', recipientEmail:'pilot-demo@qrv.network', certificateTitle:'QRV Production Pilot Certificate', certificateType:'Production Demo', description:'Permanent demo certificate for public pilot launch readiness checks.', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'VERIFIED', verificationUrl:'https://verify.qrv.network/QRV-PROD-CERT-000001', hash:'a4e9b2', signature:'sig-1', verificationCount:12, createdAt:now, updatedAt:now },
  { id:'2', qrvid:'QRV-PROD-CERT-000002', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Academy', recipientName:'Revocation Demo Holder', recipientEmail:'revoke-demo@qrv.network', certificateTitle:'QRV Permanent Revocation Demo Certificate', certificateType:'Production Demo', description:'Permanent revoked demo certificate used to prove public REVOKED status in launch demos.', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'REVOKED', verificationUrl:'https://verify.qrv.network/QRV-PROD-CERT-000002', hash:'b6c2d1', verificationCount:2, createdAt:now, updatedAt:now, revokedAt:now, revocationReason:'Permanent demo revocation sample' }
];

export const mockApiKeys: ApiKeyRecord[] = [{id:'k1',name:'Prod Integration',prefix:'qrv_live_9f3',createdAt:now,status:'active',lastUsedAt:now}];
export const mockAudit: AuditEvent[] = [{id:'a1',actor:'admin@issuer.org',action:'CERTIFICATE_ISSUED',target:'QRV-CERT-2026-0001',createdAt:now,details:'Registry-backed issuance completed'}];

export const mockAnalytics = {
  summary: { issued: 1240, verified: 1180, revoked: 9, expiringSoon: 21 },
  verifications: [{date:'2026-04-20',count:220},{date:'2026-04-21',count:241},{date:'2026-04-22',count:199}],
  topRecords: mockCertificates.map((c) => ({ qrvid:c.qrvid, count:c.verificationCount, recipient:c.recipientName }))
};
