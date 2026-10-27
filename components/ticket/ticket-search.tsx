'use client';

import { msg, plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SearchIcon } from 'lucide-react';
import { DueBadge } from '@/components/ticket/due-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PriorityBadge } from '@/components/board/priority-badge';
import { TypeBadge } from '@/components/ticket/ticket-type';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { CopyButton } from '@/components/common/copy-link';
import { shownLabel } from '@/lib/work/people';
import { useToken } from '@/lib/hooks/use-token';
import type { MessageDescriptor } from '@lingui/core';
import { organization, projects, tickets, type Assignee, type Project, type TicketSearchResult, type TicketType } from '@/lib/api';

const TYPES: { value: TicketType; label: MessageDescriptor }[] = [
  { value: 'bug', label: msg`Bugs` }, { value: 'feature', label: msg`Features` }, { value: 'task', label: msg`Tasks` },
];

export function TicketSearch() {
  const { t, i18n } = useLingui();
  const token = useToken();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('');
  const [types, setTypes] = useState<TicketType[]>([]);
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState<'' | 'overdue' | 'soon' | 'none'>(''); // TL-632
  const [me, setMe] = useState('');
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<Assignee[]>([]);
  const [results, setResults] = useState<TicketSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const requestId = useRef(0);
  const typeKey = types.join(',');

  const runSearch = useCallback(async (text: string, currentProject: string, currentTypes: TicketType[], currentAssignee: string, currentDue: typeof due = '') => {
    if (!token) return;
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const found = await tickets.search({ text, project: currentProject, types: currentTypes, assignee: currentAssignee, limit: 20,
        ...(currentDue && { due: currentDue }), ...((currentDue === 'overdue' || currentDue === 'soon') && { sort: 'due' as const }) }, token);
      if (request === requestId.current) {
        setResults(found);
        setActive(0);
      }
    } catch {
      if (request === requestId.current) setError(t`Couldn’t search tickets. Please try again.`);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    Promise.all([projects.list(token), organization.me(token), tickets.assignees(token)]).then(([projectList, role, people]) => {
      if (cancelled) return;
      setProjectOptions(projectList);
      setMe(role.user_id);
      setAssigneeOptions(people);
    }).catch(() => { /* filters remain usable if optional choices fail */ });
    return () => { cancelled = true; };
  }, [open, token !== null]); // token refreshes must not refetch

  useEffect(() => {
    if (!open || !token) return;
    const timeout = setTimeout(() => void runSearch(query, project, types, assignee, due), query.trim() ? 180 : 0);
    return () => clearTimeout(timeout);
  }, [open, token, query, project, typeKey, assignee, due, runSearch]);

  useEffect(() => {
    function onShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  function choose(ticket: TicketSearchResult) {
    setOpen(false);
    router.push(ticketPath(ticket));
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const next = searchKey(event.key, active, results.length);
    if (next === null) return;
    event.preventDefault();
    if (next === 'open') choose(results[active]);
    else setActive(next);
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" aria-label={t`Search tickets (Ctrl+K)`} onClick={() => setOpen(true)}>
        <SearchIcon aria-hidden className="sm:hidden" /><span className="hidden sm:inline"><Trans>Search</Trans></span> <kbd className="ml-1 hidden text-xs text-muted-foreground sm:inline">⌘K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
        <DialogContent className="top-[12%] max-h-[76vh] translate-y-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle><Trans>Search tickets</Trans></DialogTitle>
            <DialogDescription><Trans>Search titles, details, comments, or enter a ticket key or number, such as TL-123 or 123.</Trans></DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 px-4">
            <Input autoFocus role="combobox" aria-expanded="true" aria-autocomplete="list" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown} placeholder={t`Search tickets…`} aria-label={t`Search tickets`} aria-controls="ticket-search-results" aria-activedescendant={results[active] ? `search-result-${results[active].id}` : undefined} />
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label={t`Filter by project`} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={project} onChange={(event) => setProject(event.target.value)}>
                <option value="">{t`All projects`}</option>
                {projectOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <div role="group" aria-label={t`Filter by ticket type`} className="flex gap-1">
                {TYPES.map(({ value, label }) => (
                  <Button key={value} type="button" size="sm" variant={types.includes(value) ? 'secondary' : 'ghost'} aria-pressed={types.includes(value)} onClick={() => setTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}>{i18n._(label)}</Button>
                ))}
              </div>
              <select aria-label={t`Filter by assignee`} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                <option value="">{t`Any assignee`}</option>
                <option value="me">{t`Assigned to me`}</option>
                <option value="unassigned">{t`Unassigned`}</option>
                {assigneeChoices(assigneeOptions, me).map((person) => <option key={person.id} value={person.id}>{shownLabel(i18n, person)}</option>)}
              </select>
              <select aria-label={t`Filter by due date`} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={due} onChange={(event) => setDue(event.target.value as typeof due)}>
                <option value="">{t`Any due date`}</option>
                <option value="overdue">{t`Overdue`}</option>
                <option value="soon">{t`Due today or tomorrow`}</option>
                <option value="none">{t`No due date`}</option>
              </select>
              {(project || types.length || assignee || due) ? <Button type="button" size="sm" variant="link" onClick={() => { setProject(''); setTypes([]); setAssignee(''); setDue(''); }}><Trans>Clear filters</Trans></Button> : null}
            </div>
          </div>
          <div id="ticket-search-results" role="listbox" aria-label={t`Ticket search results`} className="max-h-[45vh] overflow-y-auto border-t px-2 py-2">
            <SearchResults results={results} loading={loading} error={error} active={active} onChoose={choose} onActive={setActive} onRetry={() => void runSearch(query, project, types, assignee, due)} />
          </div>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground"><Trans>↑↓ to move · Enter to open · Esc to close</Trans></p>
        </DialogContent>
      </Dialog>
    </>
  );
}

// searchKey: what a key in the search box does: the result to highlight, 'open' the highlighted
// one, or null (not ours: let the input have it).
export function searchKey(key: string, active: number, count: number): number | 'open' | null {
  switch (key) {
    case 'ArrowDown': return Math.max(Math.min(active + 1, count - 1), 0);
    case 'ArrowUp': return Math.max(active - 1, 0);
    case 'Enter': return active < count ? 'open' : null;
  }
  return null;
}

// assigneeChoices: people and agents to filter by, after "Assigned to me" (so not me) and never service keys.
export const assigneeChoices = (people: Assignee[], me: string) => people.filter((p) => p.kind !== 'service' && p.id !== me);

// SearchResults: the result list (pure, for tests): error, searching, nothing found, or the tickets
// with where each lives, the active one highlighted.
export function SearchResults({ results, loading, error, active, onChoose, onActive, onRetry }: {
  results: TicketSearchResult[]; loading: boolean; error: string; active: number;
  onChoose: (ticket: TicketSearchResult) => void; onActive: (index: number) => void; onRetry: () => void;
}) {
  const { t } = useLingui();
  return (
    <>
      {/* screen readers hear how many matched as the results change */}
      <p aria-live="polite" className="sr-only">{!error && !loading ? t`${plural(results.length, { one: '# ticket found', other: '# tickets found' })}` : ''}</p>
      {error ? <div role="alert" className="flex items-center gap-2 p-3 text-sm text-destructive">{error}<Button type="button" size="sm" variant="outline" onClick={onRetry}><Trans>Try again</Trans></Button></div>
        : loading && results.length === 0 ? <p role="status" className="p-3 text-sm text-muted-foreground"><Trans>Searching…</Trans></p>
        : results.length === 0 ? <p className="p-3 text-sm text-muted-foreground"><Trans>No tickets match this search.</Trans></p>
        : results.map((ticket, index) => (
          <div key={ticket.id} className={`flex items-center gap-2 rounded-md px-2 py-1 ${active === index ? 'bg-accent' : ''}`}>
            <button id={`search-result-${ticket.id}`} type="button" role="option" aria-selected={active === index} className="flex min-w-0 flex-1 items-start gap-2 rounded-sm py-2 text-left" onMouseEnter={() => onActive(index)} onClick={() => onChoose(ticket)}>
              <TicketKey value={ticket.key} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{ticket.title}</span>
                {ticket.snippet && <span className="block truncate text-xs text-muted-foreground">{ticket.snippet}</span>}
                <span className="block truncate text-xs text-muted-foreground">{ticket.project_name} · {ticket.board_name ? `${ticket.board_name}${ticket.column_name ? ` · ${ticket.column_name}` : ''}` : t`Backlog`}</span>
              </span>
              {ticket.type && <TypeBadge type={ticket.type} />}
              <DueBadge due={ticket.due_date} done={ticket.done} />
              <PriorityBadge priority={ticket.priority} hideDefault />
            </button>
            {ticket.key && <CopyButton value={ticket.key} label={t`Copy key`} size="sm" ariaLabel={t`Copy ticket key ${ticket.key}`} />}
          </div>
        ))}
    </>
  );
}
