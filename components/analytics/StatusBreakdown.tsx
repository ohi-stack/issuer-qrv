import { Card } from '../shared/ui';

export function StatusBreakdown({ values }: { values: Record<string, number> }) {
  return <Card><h3>Status Breakdown</h3>{Object.entries(values).map(([k,v])=><div key={k}>{k}: {v}</div>)}</Card>;
}
