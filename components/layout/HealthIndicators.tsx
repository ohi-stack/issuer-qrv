'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type State = 'loading' | 'online' | 'offline';
function Pill({ state, label }: { state: State; label: string }) {
  const map = {
    loading: { bg: '#e5e7eb', fg: '#374151', text: 'Checking…' },
    online: { bg: '#dcfce7', fg: '#166534', text: 'Online' },
    offline: { bg: '#fee2e2', fg: '#991b1b', text: 'Offline' }
  };
  const m = map[state];
  return <span className="badge" style={{ background: m.bg, color: m.fg }}>{label} {m.text}</span>;
}

export function ApiHealthIndicator() {
  const [state, setState] = useState<State>('loading');
  useEffect(() => { api.getHealth().then((h:any)=>setState((h.api === 'ok' || h.status === 'ok') ? 'online' : 'offline')).catch(()=>setState('offline')); }, []);
  return <Pill state={state} label="API" />;
}

export function RegistryHealthIndicator() {
  const [state, setState] = useState<State>('loading');
  useEffect(() => { api.getHealth().then((h:any)=>setState((h.registry === 'ok' || h.status === 'ok') ? 'online' : 'offline')).catch(()=>setState('offline')); }, []);
  return <Pill state={state} label="Registry" />;
}
