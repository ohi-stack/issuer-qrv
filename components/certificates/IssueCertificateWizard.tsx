'use client';
import { useMemo, useState } from 'react';
import { api, CertificateRecord, CreateCertificatePayload } from '@/lib/api';
import { Button, Card, ErrorState } from '../shared/ui';
import { CertificateForm } from './CertificateForm';
import { RecipientForm } from './RecipientForm';
import { ReviewIssuePanel } from './ReviewIssuePanel';
import { VerificationSettingsForm } from './VerificationSettingsForm';

export function IssueCertificateWizard() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ qrvidPrefix: 'QRV-CERT', privacyLevel: 'PUBLIC', hashAlgorithm: 'SHA-256', registryTarget: 'registry.qrv.network' });
  const [issued, setIssued] = useState<CertificateRecord | null>(null);

  const qrvid = useMemo(() => `${form.qrvidPrefix || 'QRV-CERT'}-${new Date().getUTCFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,[form.qrvidPrefix]);
  const verificationUrl = `https://verify.qrv.network/${issued?.qrvid ?? qrvid}`;

  async function submit() {
    try {
      setSubmitting(true);
      setError(null);
      const payload: CreateCertificatePayload = {
        certificateTitle: form.certificateTitle || 'Untitled Certificate',
        certificateType: form.certificateType,
        credentialCategory: form.credentialCategory,
        description: form.description,
        issueDate: form.issueDate || new Date().toISOString(),
        expirationDate: form.expirationDate || null,
        internalCertificateId: form.internalCertificateId,
        tags: (form.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        recipientName: form.recipientName || 'Unknown Recipient',
        recipientEmail: form.recipientEmail,
        recipientOrganization: form.recipientOrganization,
        recipientIdentifier: form.recipientIdentifier,
        privacyLevel: (form.privacyLevel as 'PUBLIC' | 'RESTRICTED' | 'PRIVATE') || 'PUBLIC',
        qrvidPrefix: form.qrvidPrefix,
        hashAlgorithm: 'SHA-256',
        issuerDisplay: form.issuerDisplay,
        registryTarget: 'registry.qrv.network'
      };
      const created = await api.postCertificate(payload);
      setIssued(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to issue certificate.');
    } finally {
      setSubmitting(false);
    }
  }

  if (issued) {
    return <Card><h2>Issued Successfully</h2><p>Status: <strong>VERIFIED</strong></p><p className="mono">QRVID: {issued.qrvid}</p><p className="mono">Verification URL: {verificationUrl}</p><p className='mono'>Hash: {issued.hash || 'N/A'}</p><p className='mono'>Signature: {issued.signature || 'N/A'}</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Button onClick={async () => { const qr = await api.getCertificateQr(issued.qrvid); if (qr?.url) window.open(qr.url, '_blank'); }}>Download QR Code</Button><Button className="secondary" onClick={async () => { const report = await api.getProofReport(issued.qrvid); if (report?.url) window.open(report.url, '_blank'); }}>Download Certificate PDF</Button><a className="btn" href={verificationUrl} target="_blank">Open Verification Page</a><Button className="secondary" onClick={()=>{ setIssued(null); setStep(1); }}>Issue Another</Button></div></Card>;
  }

  return <Card><h2>Issue Certificate Wizard</h2><p>Step {step} of 4</p>
    {error && <ErrorState message={error} onRetry={submit} />}
    {step===1 && <CertificateForm form={form} setForm={setForm} />}
    {step===2 && <RecipientForm form={form} setForm={setForm} />}
    {step===3 && <VerificationSettingsForm form={form} setForm={setForm} qrvid={qrvid} verificationUrl={`https://verify.qrv.network/${qrvid}`} />}
    {step===4 && <ReviewIssuePanel form={form} qrvid={qrvid} verificationUrl={`https://verify.qrv.network/${qrvid}`} />}
    <div style={{display:'flex',gap:8,marginTop:12}}>{step>1 && <Button className="secondary" onClick={()=>setStep(step-1)}>Back</Button>}{step<4 ? <Button onClick={()=>setStep(step+1)}>Next</Button> : <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit to API'}</Button>}</div>
  </Card>;
}
