import { Card } from '../shared/ui';

export function VerificationChart({ points }: { points: { date: string; count: number }[] }) {
  return <Card><h3>Verification Trend</h3>{points.map((p)=><div key={p.date}>{p.date}: {p.count}</div>)}</Card>;
}
