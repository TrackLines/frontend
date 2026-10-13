'use client';

import Link from 'next/link';
import { useState } from 'react';
import { VisibilityBadge } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import type { Roadmap } from '@/lib/api';

// RoadmapRow: a project's roadmap with its visibility, Edit, View and copy-the-share-link.
export function RoadmapRow({ roadmap }: { roadmap: Roadmap }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? `/r/${roadmap.id}` : `${window.location.origin}/r/${roadmap.id}`;
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="font-medium">{roadmap.title}</span>
      <VisibilityBadge value={roadmap.visibility} />
      <span className="ml-auto flex gap-2">
        <Link href={`/roadmaps/${roadmap.id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Edit</Link>
        <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>View</Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </span>
    </li>
  );
}
