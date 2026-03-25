import { notFound } from 'next/navigation';
import { getSharedEstimate } from '@/lib/estimate/repository';
import { SharedEstimateClient } from './SharedEstimateClient';

export default async function SharedEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    notFound();
  }

  const record = await getSharedEstimate(id);
  if (!record) {
    notFound();
  }

  return <SharedEstimateClient record={record} />;
}
