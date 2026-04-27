import { toVerifyUrl } from '@/lib/runtime-config';
import { ApiKeyRecord, AuditEvent, CertificateRecord } from '@/types/models';

const now = new Date().toISOString();
export const mockCertificates: CertificateRecord[] = [
  { id:'1', qrvid:'QRV-PROD-CERT-000001', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Academy', recipientName:'Pilot Demo Holder', recipientEmail:'pilot-demo@qrv.network', certificateTitle:'QRV Production Pilot Certificate', certificateType:'Production Demo', description:'Permanent demo certificate for public pilot launch readiness checks.', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'VERIFIED', verificationUrl:toVerifyUrl('QRV-PROD-CERT-000001'), hash:'a4e9b2', signature:'sig-1', verificationCount:12, createdAt:now, updatedAt:now },
  { id:'2', qrvid:'QRV-PROD-PROD-000001', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Supply Chain', recipientName:'Factory Lot Alpha', recipientEmail:'prod-alpha@qrv.network', certificateTitle:'QRV Production Batch Record', certificateType:'Production Record', description:'Seed production record for canonical PROD flow checks.', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'VERIFIED', verificationUrl:toVerifyUrl('QRV-PROD-PROD-000001'), hash:'b6c2d1', signature:'sig-2', verificationCount:4, createdAt:now, updatedAt:now },
  { id:'3', qrvid:'QRV-PROD-ID-000001', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Identity', recipientName:'Identity Demo Holder', recipientEmail:'id-demo@qrv.network', certificateTitle:'QRV Identity Record', certificateType:'Identity', description:'Seed identity record for public verify rendering checks.', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'VERIFIED', verificationUrl:toVerifyUrl('QRV-PROD-ID-000001'), hash:'c3f6e8', signature:'sig-3', verificationCount:8, createdAt:now, updatedAt:now },
  { id:'4', qrvid:'QRV-PROD-CERT-000002', recordType:'certificate', issuerId:'iss-1', issuerName:'QRV Academy', recipientName:'Revocation Demo Holder', recipientEmail:'revoke-demo@qrv.network', certificateTitle:'QRV Permanent Revocation Demo Certificate', certificateType:'Production Demo', description:'Permanent revoked demo certificate used to prove public REVOKED status in launch demos.', issueDate:now, expirationDate:null, privacyLevel:'PUBLIC', status:'REVOKED', verificationUrl:toVerifyUrl('QRV-PROD-CERT-000002'), hash:'d4c9f1', verificationCount:2, createdAt:now, updatedAt:now, revokedAt:now, revocationReason:'Permanent demo revocation sample' }
];

export const mockApiKeys: ApiKeyRecord[] = [{id:'k1',name:'Prod Integration',prefix:'qrv_live_9f3',createdAt:now,status:'active',lastUsedAt:now}];
export const mockAudit: AuditEvent[] = [{id:'a1',actor:'admin@issuer.org',action:'CERTIFICATE_ISSUED',target:'QRV-PROD-CERT-000001',createdAt:now,details:'Registry-backed issuance completed'}];

export const mockAnalytics = {
  summary: { issued: 1240, verified: 1180, revoked: 9, expiringSoon: 21 },
  verifications: [{date:'2026-04-20',count:220},{date:'2026-04-21',count:241},{date:'2026-04-22',count:199}],
  topRecords: mockCertificates.map((c) => ({ qrvid:c.qrvid, count:c.verificationCount, recipient:c.recipientName }))
};
