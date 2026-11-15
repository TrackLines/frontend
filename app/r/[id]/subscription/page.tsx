import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SubscriptionAction } from '@/components/roadmap/subscribe';
import { isRoadmapId } from '@/lib/site/public-roadmap';

// Where the links in a roadmap's emails land (TL-903): ?confirm=<token> or ?unsubscribe=<token>.
// The token is a secret, so the page stays out of search results and sends no referrer.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function RoadmapSubscriptionPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
  const confirm = one(query.confirm), unsubscribe = one(query.unsubscribe);
  if (!isRoadmapId(id) || (!confirm && !unsubscribe)) notFound();
  return <SubscriptionAction roadmapId={id} action={unsubscribe ? 'unsubscribe' : 'confirm'} token={unsubscribe || confirm} />;
}
