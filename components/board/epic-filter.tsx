'use client';

import { Trans } from '@lingui/react/macro';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LabelFilterClear } from './label-filter-clear';
import type { EpicSummary, Ticket } from '@/lib/api';

// Filter a board or the backlog by epic (TL-215): one epic at a time, kept in the URL as ?epic=<id>.

export const parseEpic = (params: { get(name: string): string | null }) => params.get('epic') ?? '';

// epicQuery: the page's query string with epic set ('' clears it), leaving other filters alone.
export function epicQuery(search: string, epic: string): string {
  const params = new URLSearchParams(search);
  if (epic) params.set('epic', epic);
  else params.delete('epic');
  return params.toString();
}

// filterTicketsByEpic: a board's tickets in the epic (any depth: the backend works out epic_id).
export const filterTicketsByEpic = <T extends Pick<Ticket, 'epic_id'>>(tickets: T[], epic: string): T[] =>
  epic ? tickets.filter((t) => t.epic_id === epic) : tickets;

// EpicFilter: shown when the project has open epics, or one is chosen (so it can be cleared).
export function EpicFilter({ epics, epic, onEpicChange }: { epics: EpicSummary[]; epic: string; onEpicChange: (epic: string) => void }) {
  const open = epics.filter((e) => !e.done || e.id === epic);
  if (open.length === 0 && !epic) return null;
  const chosen = epics.find((e) => e.id === epic);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Badge variant={epic ? 'secondary' : 'outline'} className="cursor-pointer transition-none">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground"><Trans>Epic</Trans></span>
            {epic && <><span className="max-w-40 truncate font-medium text-foreground">{chosen?.title ?? <Trans>chosen</Trans>}</span><LabelFilterClear onClick={() => onEpicChange('')} /></>}
          </span>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel><Trans>Filter by epic</Trans></DropdownMenuLabel>
          <DropdownMenuRadioGroup value={epic} onValueChange={(v) => onEpicChange(String(v ?? ''))}>
            {open.map((e) => <DropdownMenuRadioItem key={e.id} value={e.id}>{e.key ? `${e.key} ` : ''}{e.title}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
          {epic && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onEpicChange('')}><Trans>Clear epic filter</Trans></DropdownMenuItem></>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
