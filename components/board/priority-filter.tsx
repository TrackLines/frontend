'use client';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LabelFilterClear } from './label-filter-clear';
import type { Ticket } from '@/lib/api';

export const PRIORITIES = [
  { value: 'urgent', label: msg`Urgent` },
  { value: 'high', label: msg`High` },
  { value: 'medium', label: msg`Medium` },
  { value: 'low', label: msg`Low` },
] as const;

const validPriorities = new Set<string>(PRIORITIES.map(({ value }) => value));

export function parsePriorities(params: { getAll(name: string): string[] }): string[] {
  return [...new Set(params.getAll('priority').filter((value) => validPriorities.has(value)))];
}

export function priorityQuery(search: string, priorities: string[]): string {
  const params = new URLSearchParams(search);
  params.delete('priority');
  for (const priority of priorities) if (validPriorities.has(priority)) params.append('priority', priority);
  return params.toString();
}

export function ticketFilterQuery(search: string, labels: string[], priorities: string[]): string {
  const params = new URLSearchParams(search);
  params.delete('label');
  params.delete('priority');
  if (labels.length > 0) params.set('label', labels.join(','));
  for (const priority of priorities) if (validPriorities.has(priority)) params.append('priority', priority);
  return params.toString();
}

export function parseLabels(params: { get(name: string): string | null }): string[] {
  return (params.get('label') ?? '').split(',').map((label) => label.trim()).filter(Boolean);
}

export function filterTicketsByPriorities<T extends Pick<Ticket, 'priority'>>(tickets: T[], priorities: string[]): T[] {
  if (priorities.length === 0) return tickets;
  const selected = new Set(priorities);
  return tickets.filter((ticket) => ticket.priority && selected.has(ticket.priority));
}

export function PriorityFilter({ priorities, onPrioritiesChange }: { priorities: string[]; onPrioritiesChange: (priorities: string[]) => void }) {
  const { i18n } = useLingui();
  const toggle = (priority: string) => onPrioritiesChange(
    priorities.includes(priority) ? priorities.filter((value) => value !== priority) : [...priorities, priority],
  );
  const clear = () => onPrioritiesChange([]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Badge variant={priorities.length > 0 ? 'secondary' : 'outline'} className="cursor-pointer transition-none">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground"><Trans>Priority</Trans></span>
            {priorities.length > 0 && <><span className="text-foreground font-medium">({priorities.length})</span><LabelFilterClear onClick={clear} /></>}
          </span>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel><Trans>Filter by priority</Trans></DropdownMenuLabel>
          {PRIORITIES.map(({ value, label }) => (
            <DropdownMenuCheckboxItem key={value} checked={priorities.includes(value)} onCheckedChange={() => toggle(value)}>
              {i18n._(label)}
            </DropdownMenuCheckboxItem>
          ))}
          {priorities.length > 0 && <><DropdownMenuSeparator /><DropdownMenuItem onClick={clear}><Trans>Clear priority filter</Trans></DropdownMenuItem></>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
