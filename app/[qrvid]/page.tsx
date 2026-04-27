import { redirect } from 'next/navigation';

type Params = { qrvid: string };

export default async function LegacyQrvidRoute({ params }: { params: Promise<Params> }) {
  const { qrvid } = await params;
  redirect(`/verify/${encodeURIComponent(qrvid)}`);
}
