import { AuditEvent } from '@/types/models';
import { DataTable } from '../shared/ui';

export function AuditLogTable({ rows }: { rows: AuditEvent[] }) {
  return <DataTable columns={['Time (UTC)','Actor','Action','Target']} rows={rows.map((r)=><tr key={r.id}><td>{r.createdAt}</td><td>{r.actor}</td><td>{r.action}</td><td className="mono">{r.target}</td></tr>)} />;
}
