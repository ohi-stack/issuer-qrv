import { Input } from '../shared/ui';

export function VerificationSettingsForm({ form, setForm, qrvid, verificationUrl }: { form: Record<string,string>; setForm: (v: Record<string,string>) => void; qrvid: string; verificationUrl: string }) {
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return <div className="grid"><label>qrvid prefix<Input value={form.qrvidPrefix||''} onChange={(e)=>set('qrvidPrefix', e.target.value)} /></label><p className="mono">Generated QRVID: {qrvid}</p><p className="mono">Verification URL: {verificationUrl}</p><p>hash algorithm SHA-256</p><label>issuer display<Input value={form.issuerDisplay||''} onChange={(e)=>set('issuerDisplay', e.target.value)} /></label><p>registry target: registry.qrv.network</p></div>;
}
