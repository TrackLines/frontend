import { msg } from '@lingui/core/macro';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { serverI18n } from '@/lib/i18n/server-i18n';

// shown instantly while navigating here
export default async function Loading() {
  const i18n = await serverI18n();
  return <ListPageSkeleton label={i18n._(msg`Loading organization settings…`)} sections={2} />;
}
