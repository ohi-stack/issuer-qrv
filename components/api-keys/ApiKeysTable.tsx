'use client';
import { api } from '@/lib/api';
import { ApiKeyRecord } from '@/types/models';
import { Button, DataTable } from '../shared/ui';

export function ApiKeysTable({ rows }: { rows: ApiKeyRecord[] }) {
  return <DataTable columns={['Name','Key Prefix','Status','Created','Actions']} rows={rows.map((k)=><tr key={k.id}><td>{k.name}</td><td className="mono">{k.prefix}••••••</td><td>{k.status}</td><td>{k.createdAt}</td><td><Button className='secondary' onClick={async ()=>{ await api.rotateApiKey(k.id); }}>Rotate</Button> <Button className='danger' onClick={async ()=>{ await api.deleteApiKey(k.id); }}>Revoke</Button></td></tr>)} />;
}
