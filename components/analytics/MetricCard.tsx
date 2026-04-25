import { Card } from '../shared/ui';

export function MetricCard({ label, value }: { label: string; value: string | number }) { return <Card><p>{label}</p><h2>{value}</h2></Card>; }
