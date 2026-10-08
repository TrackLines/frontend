'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ProjectLabel, Ticket } from '@/lib/api';
import { LabelFilterClear } from './label-filter-clear';

type Props = {
  options: ProjectLabel[] | null; // labels on the tickets being filtered (null = still loading)
  labels: string[];
  onLabelsChange: (labels: string[]) => void;
};

// LabelFilter lists only the labels on the tickets it filters (a board's, or the backlog's), not the whole project's.
export function LabelFilter({ options, labels, onLabelsChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync from URL on mount and when searchParams change
  useEffect(() => {
    const raw = searchParams.get('label');
    if (raw && raw.trim()) {
      const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (parsed.length > 0) onLabelsChange(parsed);
    }
  }, [searchParams]);

  // Sync selections back to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (labels.length > 0) {
      params.set('label', labels.join(','));
    } else {
      params.delete('label');
    }
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`${window.location.pathname}?${next}`, { scroll: false });
    }
  }, [labels, router, searchParams]);

  const toggle = useCallback(
    (label: string) => {
      const lower = label.toLowerCase();
      const next = labels.some((l) => l.toLowerCase() === lower)
        ? labels.filter((l) => l.toLowerCase() !== lower)
        : [...labels, label];
      onLabelsChange(next);
    },
    [labels, onLabelsChange],
  );

  const clear = useCallback(() => onLabelsChange([]), [onLabelsChange]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Badge variant={labels.length > 0 ? 'secondary' : 'outline'} className="cursor-pointer transition-none">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Labels</span>
            {labels.length > 0 && (
              <>
                <span className="text-foreground font-medium">({labels.length})</span>
                <LabelFilterClear onClick={clear} />
              </>
            )}
          </span>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {/* Base UI throws if a group label renders outside a group */}
        <DropdownMenuGroup>
        <DropdownMenuLabel>Filter by label</DropdownMenuLabel>
        {options === null ? (
          <div className="text-sm text-muted-foreground px-2 py-1">Loading labels…</div>
        ) : options.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-1">No labels on these tickets yet.</div>
        ) : (
          <>
            {options.map(({ label: l, count }) => {
              const checked = labels.some((x) => x.toLowerCase() === l.toLowerCase());
              return (
                <DropdownMenuCheckboxItem
                  key={l}
                  checked={checked}
                  onCheckedChange={() => toggle(l)}
                  className="capitalize"
                >
                  {l}
                  <span className="ml-auto text-muted-foreground text-xs">({count})</span>
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clear}>Clear filter</DropdownMenuItem>
          </>
        )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function filterTicketsByLabels(tickets: Ticket[], labels: string[]): Ticket[] {
  if (labels.length === 0) return tickets;
  const lower = new Set(labels.map((l) => l.toLowerCase()));
  return tickets.filter((t) => t.labels && t.labels.some((l) => lower.has(l.toLowerCase())));
}

// labelCounts: the labels on these tickets with how many use each, merged case-insensitively
// (first spelling wins), most used first — the same shape the backlog endpoint returns.
export function labelCounts(tickets: Ticket[]): ProjectLabel[] {
  const byKey = new Map<string, ProjectLabel>();
  for (const t of tickets) {
    for (const l of new Set((t.labels ?? []).map((x) => x.toLowerCase()))) {
      const spelled = t.labels!.find((x) => x.toLowerCase() === l)!;
      const c = byKey.get(l) ?? { label: spelled, count: 0 };
      c.count++;
      byKey.set(l, c);
    }
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
