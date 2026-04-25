'use client';
import { useState } from 'react';
import { ApiKeysTable } from '@/components/api-keys/ApiKeysTable';
import { CreateApiKeyModal } from '@/components/api-keys/CreateApiKeyModal';
import { Button, EmptyState, ErrorState, LoadingState } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api-query';

export default function ApiKeys(){
  const [open,setOpen]=useState(false);
  const query = useApiQuery(() => api.getApiKeys());

  if (query.loading) return <LoadingState title='Loading API keys…' />;
  if (query.error) return <ErrorState message={`API unavailable: ${query.error}`} onRetry={query.retry} />;

  return <>
    <div style={{display:'flex',justifyContent:'space-between'}}><h1>API Keys</h1><Button onClick={()=>setOpen(true)}>Create API Key</Button></div>
    {!query.data?.length ? <EmptyState title='No API keys found' /> : <ApiKeysTable rows={query.data} />}
    <CreateApiKeyModal open={open} onClose={()=>setOpen(false)} onCreated={query.retry} />
    <p>Security: full API keys are never re-displayed after creation.</p>
  </>;
}
