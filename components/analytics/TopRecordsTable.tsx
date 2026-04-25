import { DataTable } from '../shared/ui';

export function TopRecordsTable({ rows }: { rows: { qrvid: string; recipient: string; count: number }[] }) {
  return <DataTable columns={['QRVID','Recipient','Count']} rows={rows.map((r)=><tr key={r.qrvid}><td className="mono">{r.qrvid}</td><td>{r.recipient}</td><td>{r.count}</td></tr>)} />;
}
