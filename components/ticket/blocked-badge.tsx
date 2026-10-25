'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { LockIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Shown on tickets that wait on others that aren't done yet (they can't be claimed). href: where the
// list of what blocks it is (the ticket page's Dependencies, TL-639).
export function BlockedBadge({ href }: { href?: string }) {
  const { t } = useLingui();
  const badge = (
    <Badge variant="outline" className="border-destructive/40 text-destructive" title={t`Waiting on tickets that aren't done yet`}>
      <LockIcon aria-hidden /> <Trans>Blocked</Trans>
    </Badge>
  );
  return href ? <a href={href} aria-label={t`Blocked: see what it's waiting on`}>{badge}</a> : badge;
}
