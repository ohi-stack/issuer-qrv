export function ReviewIssuePanel({ form, qrvid, verificationUrl }: { form: Record<string,string>; qrvid: string; verificationUrl: string }) {
  return <div><h3>Review Summary</h3><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify({ ...form, qrvid, verificationUrl }, null, 2)}</pre></div>;
}
