import { FormPageSkeleton } from '@/components/page-skeletons';

// shown instantly while navigating here
export default function Loading() {
  return <FormPageSkeleton label="Loading roadmap…" />;
}
