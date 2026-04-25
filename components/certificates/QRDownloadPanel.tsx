'use client';
import { api } from '@/lib/api';
import { Button, Card } from '../shared/ui';

export function QRDownloadPanel({ qrvid }: { qrvid: string }) {
  return <Card><h3>Downloads</h3><div style={{display:'flex',gap:8}}><Button onClick={async ()=>{ const qr = await api.getCertificateQr(qrvid); if (qr.url) window.open(qr.url, '_blank'); }}>Download QR Code</Button><Button className="secondary" onClick={async ()=>{ const report = await api.getProofReport(qrvid); if (report.url) window.open(report.url, '_blank'); }}>Download Certificate PDF</Button></div></Card>;
}
