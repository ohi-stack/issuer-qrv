import { Input, Select } from '../shared/ui';

export function RecipientForm({ form, setForm }: { form: Record<string,string>; setForm: (v: Record<string,string>) => void }) {
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return <div className="grid"><label>recipientName<Input aria-label="recipientName" value={form.recipientName||''} onChange={(e)=>set('recipientName', e.target.value)} /></label><label>recipientEmail<Input aria-label="recipientEmail" value={form.recipientEmail||''} onChange={(e)=>set('recipientEmail', e.target.value)} /></label><label>recipientOrganization<Input aria-label="recipientOrganization" value={form.recipientOrganization||''} onChange={(e)=>set('recipientOrganization', e.target.value)} /></label><label>recipientIdentifier<Input aria-label="recipientIdentifier" value={form.recipientIdentifier||''} onChange={(e)=>set('recipientIdentifier', e.target.value)} /></label><label>privacyLevel<Select aria-label="privacyLevel" value={form.privacyLevel||'PUBLIC'} onChange={(e)=>set('privacyLevel',e.target.value)}><option>PUBLIC</option><option>RESTRICTED</option><option>PRIVATE</option></Select></label></div>;
}
