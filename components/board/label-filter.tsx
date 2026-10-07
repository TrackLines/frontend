'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { projects, tickets, type Ticket } from '@/lib/api';
import { LabelFilterClear } from './label-filter-clear';

type Props = {
  boardId?: string;
  projectId: string;
  token: string;
  labels: string[];
  onLabelsChange: (labels: string[]) => void;
};

export function LabelFilter({ boardId, projectId, token, labels, onLabelsChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [options, setOptions] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Load label options from the project
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    projects.labels(projectId, token)
      .then((items) => {
        if (!cancelled) {
          setOptions(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, token]);

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
        <DropdownMenuLabel>Filter by label</DropdownMenuLabel>
        {loading ? (
          <div className="text-sm text-muted-foreground px-2 py-1">Loading labels…</div>
        ) : options.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-1">No labels in this project yet.</div>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function filterTicketsByLabels(tickets: Ticket[], labels: string[]): Ticket[] {
  if (labels.length === 0) return tickets;
  const lower = new Set(labels.map((l) => l.toLowerCase()));
  return tickets.filter((t) => t.labels && t.labels.some((l) => lower.has(l.toLowerCase())));
}
