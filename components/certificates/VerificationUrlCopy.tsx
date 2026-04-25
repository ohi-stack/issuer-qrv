'use client';
import { Button } from '../shared/ui';

export function VerificationUrlCopy({ url }: { url: string }) {
  return <div><p className="mono">{url}</p><Button className="secondary" onClick={() => navigator.clipboard.writeText(url)}>Copy Verification URL</Button></div>;
}
