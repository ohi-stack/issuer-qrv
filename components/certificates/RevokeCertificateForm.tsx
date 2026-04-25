'use client';
import { Button, Card, Input } from '../shared/ui';

export function RevokeCertificateForm({ reason, setReason, onRevoke }: { reason: string; setReason: (v: string) => void; onRevoke: () => void }) {
  return <Card><h3>Revoke Certificate</h3><Input id="revokeReason" placeholder="Reason" value={reason} onChange={(e)=>setReason(e.target.value)} /><Button className="danger" onClick={onRevoke} disabled={!reason.trim()}>Request Revocation</Button></Card>;
}
