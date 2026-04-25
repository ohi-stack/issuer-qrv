import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VerifyView } from '@/components/verify/VerifyView';
import { isIssuerRole } from '@/lib/app-role';
import { fetchVerification } from '@/lib/verification';

type Params = { qrvid: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { qrvid } = await params;

  return {
    title: `Verification ${qrvid}`,
    description: `Verification details for QRVID ${qrvid} from QRV registry.`,
    alternates: {
      canonical: `/${encodeURIComponent(qrvid)}`,
    },
  };
}

export default async function VerifyRoute({ params }: { params: Promise<Params> }) {
  if (isIssuerRole()) {
    notFound();
  }

  const { qrvid } = await params;

  if (!qrvid?.trim()) {
    notFound();
  }

  const record = await fetchVerification(qrvid);
  return <VerifyView record={record} />;
}
