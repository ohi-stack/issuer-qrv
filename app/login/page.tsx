'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input } from '@/components/shared/ui';

export default function LoginPage(){
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  return <Card><h1>Issuer Login</h1><p>Authentication placeholder. Production requires real SSO/session integration.</p><label>Email<Input aria-label='email' /></label><label>Password<Input aria-label='password' type='password' /></label><Button onClick={()=>{document.cookie='qrv_issuer_session=1; path=/; max-age=28800; samesite=lax'; router.push(next);}}>Sign in</Button></Card>;
}
