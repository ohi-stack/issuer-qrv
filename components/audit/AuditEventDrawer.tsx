import { AuditEvent } from '@/types/models';
import { Card } from '../shared/ui';

export function AuditEventDrawer({ event }: { event?: AuditEvent }) {
  if (!event) return null;
  return <Card><h4>Audit Event Details</h4><pre>{JSON.stringify(event, null, 2)}</pre></Card>;
}
