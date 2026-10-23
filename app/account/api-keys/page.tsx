'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { ApiKeysManager } from '@/components/settings/api-keys';
import { useToken } from '@/lib/use-token';

// Your API keys (TL-451): personal keys and AI agents, both acting as you. The organization's service
// keys are in Settings → API keys.
export default function YourApiKeysPage() {
  const token = useToken();
  const { t } = useLingui();
  if (!token) return <ListPageSkeleton label={t`Loading API keys…`} action />;
  return (
    <ApiKeysManager token={token} kinds={['personal', 'ai']} back={{ href: '/account', label: t`Your settings` }} intro={<>
      <Trans>Keys that act as you, for your own scripts, displays and AI agents. Send one as{' '}
      <code className="rounded bg-muted px-1">Authorization: Bearer tl_p_…</code> (or <code className="rounded bg-muted px-1">tl_ai_…</code> for an agent) to <code className="rounded bg-muted px-1">/api</code>.</Trans>
    </>} />
  );
}
