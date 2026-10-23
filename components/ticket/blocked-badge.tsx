'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { LockIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Shown on tickets that wait on others that aren't done yet (they can't be claimed).
export function BlockedBadge() {
  const { t } = useLingui();
  return (
    <Badge variant="outline" className="border-destructive/40 text-destructive" title={t`Waiting on tickets that aren't done yet`}>
      <LockIcon aria-hidden /> <Trans>Blocked</Trans>
    </Badge>
  );
}
