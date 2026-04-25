'use client';
import { useState } from 'react';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { AuditEventDrawer } from '@/components/audit/AuditEventDrawer';
import { EmptyState, ErrorState, Input, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function AuditLogs(){
  const [filter, setFilter] = useState('');
  const query = useApiQuery(() => api.getAuditLogs());

  if (query.loading) return <LoadingState title='Loading audit events…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;
  if (!query.data?.length) return <EmptyState title='No audit events found' />;

  const rows = query.data.filter((r) => `${r.action} ${r.actor} ${r.target}`.toLowerCase().includes(filter.toLowerCase()));

  return <><h1>Audit Logs</h1><label>Filter<Input className='input' aria-label='filter events' value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder='event type/actor' /></label>{rows.length ? <AuditLogTable rows={rows} /> : <EmptyState title='No matching events' /> }<AuditEventDrawer event={rows[0]} /></>;
}
