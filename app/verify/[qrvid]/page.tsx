import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VerifyView } from '@/components/verify/VerifyView';
import { isIssuerRole } from '@/lib/app-role';
import { resolveVerification } from '@/lib/verification';

type Params = { qrvid: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { qrvid } = await params;
  return {
    title: `Verification ${qrvid}`,
    alternates: { canonical: `/verify/${encodeURIComponent(qrvid)}` },
  };
}

export default async function VerifyPage({ params }: { params: Promise<Params> }) {
  if (isIssuerRole()) notFound();

  const { qrvid } = await params;
  const record = await resolveVerification(qrvid);
  return <VerifyView record={record} />;
}
