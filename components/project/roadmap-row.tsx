'use client';

import Link from 'next/link';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { VisibilityBadge } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import type { Roadmap } from '@/lib/api';

// RoadmapRow: a project's roadmap with its visibility, Edit (for those who can, TL-413), View and copy-the-share-link.
export function RoadmapRow({ roadmap, canManage = false }: { roadmap: Roadmap; canManage?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? `/r/${roadmap.id}` : `${window.location.origin}/r/${roadmap.id}`;
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="font-medium">{roadmap.title}</span>
      <VisibilityBadge value={roadmap.visibility} />
      <span className="ml-auto flex gap-2">
        {canManage && <Link href={`/roadmaps/${roadmap.id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Trans>Edit</Trans></Link>}
        <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Trans>View</Trans></Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
        >
          {copied ? <Trans>Copied</Trans> : <Trans>Copy link</Trans>}
        </Button>
      </span>
    </li>
  );
}
