import { msg } from '@lingui/core/macro';
import { FormPageSkeleton } from '@/components/page-skeletons';
import { serverI18n } from '@/lib/server-i18n';

// shown instantly while navigating here
export default async function Loading() {
  const i18n = await serverI18n();
  return <FormPageSkeleton label={i18n._(msg`Loading roadmap…`)} />;
}
