'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { PriorityBadge } from '@/components/board/priority-badge';
import { PriorityFilter } from '@/components/board/priority-filter';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { TypeBadge } from '@/components/ticket-type';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projects as projectsApi, tickets, type Project, type TicketSearchResult } from '@/lib/api';
import { boardOptions, countLabel, groupWork, workQuery, type WorkMode } from '@/lib/my-work';

const PAGE = 50;
const ALL = '__all';

// MyWork: my tickets across every board and project in the org, most recently changed first — those
// assigned to me, or (Created by me tab) those I raised. Open by default; done work on request.
export function MyWork({ token, initialMode = 'assigned' }: { token: string; initialMode?: WorkMode }) {
  const { t, i18n } = useLingui();
  const [mode, setMode] = useState<WorkMode>(initialMode);
  const [items, setItems] = useState<TicketSearchResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const [project, setProject] = useState('');
  const [board, setBoard] = useState('');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [includeDone, setIncludeDone] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const latest = useRef(0);

  useEffect(() => { projectsApi.list(token).then(setProjectList, () => {}); }, []);

  async function load(nextPage: number) {
    const request = ++latest.current;
    setFailed(false);
    try {
      const { tickets: found, total: all } = await tickets.searchPage({ ...workQuery(mode), status: includeDone ? undefined : 'open',
        project: project || undefined, board: board || undefined, priorities, limit: PAGE, page: nextPage }, token);
      if (request !== latest.current) return;
      setItems((cur) => (nextPage === 1 ? found : [...(cur ?? []), ...found]));
      if (nextPage === 1 || all > 0) setTotal(all); // past the last page the count is 0: keep the one we had
      setPage(nextPage);
      if (nextPage === 1 && !board) setBoards(boardOptions(found));
    } catch {
      if (request === latest.current) setFailed(true);
    }
  }
  useEffect(() => { setItems(null); void load(1); }, [mode, project, board, priorities.join(','), includeDone]);

  return (
    <div className="grid gap-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as WorkMode)}>
        <TabsList>
          <TabsTrigger value="assigned"><Trans>Assigned to me</Trans></TabsTrigger>
          <TabsTrigger value="created"><Trans>Created by me</Trans></TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        <Select items={{ [ALL]: t`All projects`, ...Object.fromEntries(projectList.map((p) => [p.id, p.name])) }} value={project || ALL}
          onValueChange={(v) => { setProject(!v || v === ALL ? '' : String(v)); setBoard(''); }}>
          <SelectTrigger size="sm" aria-label={t`Filter by project`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}><Trans>All projects</Trans></SelectItem>
            {projectList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ [ALL]: t`All boards`, ...Object.fromEntries(boards.map((b) => [b.id, b.name])) }} value={board || ALL}
          onValueChange={(v) => setBoard(!v || v === ALL ? '' : String(v))}>
          <SelectTrigger size="sm" aria-label={t`Filter by board`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}><Trans>All boards</Trans></SelectItem>
            {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <PriorityFilter priorities={priorities} onPrioritiesChange={setPriorities} />
        <Button size="sm" variant={includeDone ? 'secondary' : 'ghost'} aria-pressed={includeDone} onClick={() => setIncludeDone((d) => !d)}>
          <Trans>Include done</Trans>
        </Button>
      </div>
      <MyWorkView items={items} failed={failed} filtered={!!project || !!board || priorities.length > 0}
        empty={mode === 'created' ? t`You haven’t created any tickets yet.` : t`Nothing assigned to you right now.`} />
      {items && countLabel(i18n, items.length, total) && (
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => void load(page + 1)}><Trans>Load more</Trans></Button>
          <span className="text-sm text-muted-foreground">{countLabel(i18n, items.length, total)}</span>
        </div>
      )}
    </div>
  );
}

// MyWorkView: my tickets grouped by project and board (pure, for tests).
export function MyWorkView({ items, failed, filtered, empty }: {
  items: TicketSearchResult[] | null; failed: boolean; filtered: boolean; empty?: string;
}) {
  const { t, i18n } = useLingui();
  if (failed) return <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load your work. Please try again.</Trans></p>;
  if (items === null) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading your work…</Trans></p>;
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        {filtered ? t`Nothing of yours matches these filters.` : empty ?? t`Nothing assigned to you right now.`}
      </p>
    );
  }
  return (
    <div className="grid gap-6">
      {groupWork(i18n, items).map((g) => (
        <section key={g.project} aria-label={g.project} className="grid gap-3">
          <h2 className="text-lg font-semibold">{g.project}</h2>
          {g.boards.map((b) => (
            <div key={b.name} className="grid gap-1">
              <h3 className="text-sm font-medium text-muted-foreground">{b.name}</h3>
              <ul className="divide-y rounded-xl border">
                {b.tickets.map((tk) => (
                  <li key={tk.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                    <TicketKey value={tk.key} />
                    <Link href={ticketPath(tk)} className="min-w-0 flex-1 font-medium hover:underline">{tk.title}</Link>
                    {tk.type && tk.type !== 'task' && <TypeBadge type={tk.type} />}
                    <PriorityBadge priority={tk.priority} hideDefault />
                    {tk.blocked && <BlockedBadge />}
                    {tk.done ? <Badge variant="outline"><Trans>Done</Trans></Badge> : <Badge variant="secondary">{tk.column_name ?? t`Backlog`}</Badge>}
                    {tk.updated_at && <span className="text-xs text-muted-foreground"><When iso={tk.updated_at} /></span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
