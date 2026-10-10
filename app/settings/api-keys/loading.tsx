import { ListPageSkeleton } from '@/components/page-skeletons';

// shown instantly while navigating here
export default function Loading() {
  return <ListPageSkeleton label="Loading API keys…" action />;
}
