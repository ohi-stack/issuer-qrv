'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, Input } from '../shared/ui';

export function CreateApiKeyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [name, setName] = useState('');
  const [newPrefix, setNewPrefix] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!open) return null;

  return <Card><h3>Create API Key</h3><Input placeholder="Key name" value={name} onChange={(e)=>setName(e.target.value)} />
    <p>Full key is only displayed once. Store securely.</p>
    {newPrefix && <p className='mono'>Created key prefix: {newPrefix}••••••</p>}
    {error && <p style={{color:'#dc2626'}}>{error}</p>}
    <Button onClick={async ()=>{
      try {
        setError(null);
        const created = await api.postApiKey(name || 'New Key');
        setNewPrefix(created.prefix);
        onCreated?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create key');
      }
    }}>Create</Button> <Button className="secondary" onClick={onClose}>Close</Button></Card>;
}
