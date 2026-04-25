'use client';
import { useState } from 'react';
import { Button, Card, Input } from '../shared/ui';

export function RevocationConfirmModal({ open, qrvid, onConfirm, onClose }: { open: boolean; qrvid: string; onConfirm: () => void; onClose: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  if (!open) return null;
  const required = `REVOKE ${qrvid}`;
  return <Card><p>Confirm revocation by typing: <strong>{required}</strong></p><Input value={confirmText} onChange={(e)=>setConfirmText(e.target.value)} /><Button className="danger" onClick={onConfirm} disabled={confirmText !== required}>Confirm</Button> <Button className="secondary" onClick={onClose}>Cancel</Button></Card>;
}
