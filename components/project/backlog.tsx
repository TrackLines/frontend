'use client';

import { SimilarTickets, useSimilarTickets } from '@/components/ticket/similar-tickets';
import { MarkdownTextarea, plainText } from '@/components/markdown';
import { When } from '@/components/when';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pager } from '@/components/pager';
import { TICKET_TYPES as TYPES, TypeBadge, TypePicker } from '@/components/ticket-type';
import { TICKET_DIALOG_WIDTH, TicketDialog } from '@/components/board/ticket-dialog';
import { EstimateSelect } from '@/components/board/estimate';
import { RefinementMode } from '@/components/project/refinement';
import { FollowedTicket, HostedBar } from '@/components/hosted-bar';
import { followedTicket, refineLabel } from '@/lib/hosted';
import { useHosted } from '@/lib/use-hosted';
import { usePeople } from '@/lib/use-people';
import type { EstimateScale } from '@/lib/estimates';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { Badge } from '@/components/ui/badge';
import { LabelDrawer, MoreLabels, splitLabels, TicketLabels } from '@/components/ticket/labels';
import { attachAll, PendingAttachments, type PendingFile } from '@/components/ticket/pending-attachments';
import { BACKLOG_CHANGED } from '@/components/quick-add-ticket';
import { ApiError, backlog, BacklogTicket, type BacklogPage, type BacklogSort, type BacklogStatus, type EpicSummary, boards as boardsApi, organization, tickets, type Board, type OrganizationRole, type Ticket, type TicketType, hostedPaths } from '@/lib/api';
import { canRefine } from '@/lib/board-access';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useCachedState } from '@/lib/page-cache';
import { ListSkeleton } from '@/components/page-skeletons';
import { LabelFilter } from '@/components/board/label-filter';
import { parseLabels, parsePriorities, PriorityFilter, ticketFilterQuery } from '@/components/board/priority-filter';
import { EpicFilter, epicQuery, parseEpic } from '@/components/board/epic-filter';
import { useRouter, useSearchParams } from 'next/navigation';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';

type Props = { projectId: string; boards: Board[]; token: string };

const PER_PAGE = 10;

// Backlog: tickets in the project that aren't on any board or sprint yet (e.g. triaged bugs).
export function Backlog({ projectId, boards, token }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useCachedState<BacklogPage>(`backlog-page:${projectId}`); // instant on revisit, refreshed on mount
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<TicketType | 'all'>('all');
  const [labelFilter, setLabelFilter] = useState<string[]>(() => parseLabels(searchParams));
  const [priorityFilter, setPriorityFilter] = useState<string[]>(() => parsePriorities(searchParams));
  const [epicFilter, setEpicFilter] = useState(() => parseEpic(searchParams)); // ?epic=<id> (TL-215)
  const [epics, setEpics] = useState<EpicSummary[]>([]);
  const loadEpics = () => tickets.epics(projectId, token).then(setEpics, () => {}); // a failed refresh keeps the last list
  useEffect(() => { void loadEpics(); }, [projectId]); // token refreshes must not refetch
  const [sort, setSort] = useState<BacklogSort>('manual');
  const [status, setStatus] = useState<BacklogStatus>('open'); // closed tickets stay findable (owner, 2026-10-17)
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // ticket id being moved/deleted
  const [refining, setRefining] = useState(false); // refinement mode: plan tickets into boards' next sprints
  const [sizing, setSizing] = useState<{ ticket: BacklogTicket; board: Board } | null>(null); // moving onto a board that needs an estimate
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<BacklogTicket | null>(null);
  const [editScale, setEditScale] = useState<EstimateScale>('none'); // a planned ticket is sized on its planned board's scale
  const [changes, setChanges] = useState(0); // bumps on every reload, so refine mode refreshes too
  const openEditor = (t: BacklogTicket, scale: EstimateScale = 'none') => { setEditScale(scale); setEditing(t); };

  // hosted refinement (TL-224): Refine starts a session others can join; the host's open ticket opens
  // read-only for followers, so nobody has to share their screen
  const paths = useMemo(() => hostedPaths.refinement(projectId), [projectId]);
  const session = useHosted(paths, token);
  const people = usePeople(token);
  const hosting = session.role === 'host';
  // planning is for org admins and the sprint boards' team leaders (TL-241); anyone can join to watch
  const [role, setRole] = useState<OrganizationRole | null>(null);
  useEffect(() => { organization.me(token).then(setRole, () => setRole(null)); }, [projectId]); // token refreshes must not refetch
  useEffect(() => { if (refining && hosting) session.focus({ ticketId: editing?.id ?? null }); }, [editing?.id, refining, hosting]);
  async function refine() {
    setError('');
    try {
      if (session.session) await session.join(); else await session.start(); // joining also brings a returning host back
    } catch {
      setError('Couldn’t start the shared session; refining on your own.');
    }
    setRefining(true);
  }
  function doneRefining() {
    if (hosting) void session.end(); else session.leave();
    setRefining(false);
    void load();
  }

  // server does the filtering, ordering and paging; only the latest request may land
  const latest = useRef(0);
  const lastLoaded = useRef(''); // the last page loaded, to tell a real change from an identical refresh
  const load = async (quiet = false) => {
    const req = ++latest.current;
    try {
      const d = await backlog.page(projectId, { type: filter === 'all' ? undefined : filter, labels: labelFilter, priorities: priorityFilter, sort, status, page, perPage: PER_PAGE, epic: epicFilter }, token);
      if (req !== latest.current) return;
      const last = Math.max(1, Math.ceil(d.counts[filter] / PER_PAGE));
      if (page > last) return setPage(last); // e.g. the last ticket on the last page moved away
      const changed = JSON.stringify(d) !== lastLoaded.current; // identical refreshes redraw nothing (TL-232)
      lastLoaded.current = JSON.stringify(d);
      if (changed) {
        setData(d);
        setChanges((c) => c + 1);
      }
      setFailed(false);
    } catch {
      // keep already-rendered data during transient failures
      if (req === latest.current && (!quiet || data === null)) setFailed(true);
    }
  };
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }); // declared before the effects that call it, so they see this render's filters

  useEffect(() => {
    setLabelFilter(parseLabels(searchParams));
    setPriorityFilter(parsePriorities(searchParams));
    setEpicFilter(parseEpic(searchParams));
  }, [searchParams]);
  useEffect(() => { void loadRef.current(); }, [projectId, filter, labelFilter, priorityFilter, epicFilter, sort, status, page]); // token refreshes must not refetch
  useEffect(() => {
    const onChange = (e: Event) => { if ((e as CustomEvent).detail?.projectId === projectId) void loadRef.current(); };
    window.addEventListener(BACKLOG_CHANGED, onChange);
    return () => window.removeEventListener(BACKLOG_CHANGED, onChange);
  }, [projectId]);

  useAutoRefresh(() => { void loadEpics(); return load(true); }, !adding && !editing && !refining && busy === null); // epics too, for the filter

  const shown = data?.tickets ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.counts[filter] / PER_PAGE)) : 1;
  const changeFilter = (f: TicketType | 'all') => { setFilter(f); setPage(1); };
  const changeFilters = (labels: string[], priorities: string[]) => {
    setLabelFilter(labels);
    setPriorityFilter(priorities);
    setPage(1);
    const query = ticketFilterQuery(searchParams.toString(), labels, priorities);
    router.replace(`${window.location.pathname}${query ? `?${query}` : ''}#backlog`, { scroll: false });
  };
  const changeLabels = (labels: string[]) => changeFilters(labels, priorityFilter);
  const changePriorities = (priorities: string[]) => changeFilters(labelFilter, priorities);
  const changeEpic = (epic: string, labels = labelFilter, priorities = priorityFilter) => {
    setEpicFilter(epic);
    setPage(1);
    const query = epicQuery(ticketFilterQuery(searchParams.toString(), labels, priorities), epic);
    router.replace(`${window.location.pathname}${query ? `?${query}` : ''}#backlog`, { scroll: false });
  };
  const clearFilters = () => {
    setFilter('all');
    setStatus('open');
    setLabelFilter([]);
    setPriorityFilter([]);
    changeEpic('', [], []);
  };
  const drop = (id: string) => setData((d) => d && { ...d, tickets: d.tickets.filter((x) => x.id !== id) });

  // moveTo puts t at the bottom of the board's first column, inside its open sprint. A board with an
  // estimate scale only takes estimated tickets, so it asks for one first (sizing) and moves with it.
  async function moveTo(t: BacklogTicket, boardId: string, estimate?: string) {
    setBusy(t.id);
    setError('');
    try {
      const target = await boardsApi.get(boardId, token);
      const first = target.columns?.[0];
      if (!first) throw new Error('board has no columns');
      if ((target.estimate_scale ?? 'none') !== 'none' && !estimate) {
        setSizing({ ticket: t, board: target });
        return;
      }
      await tickets.move(t.id, first.id, first.tickets.length, token, estimate);
      drop(t.id);
      void load();
    } catch (err) {
      // 409: the sprint ends today (scope locked); 400: e.g. estimate required. The backend says which.
      setError(err instanceof ApiError && (err.status === 409 || err.status === 400) ? err.message : `Couldn’t move “${t.title}”. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: BacklogTicket) {
    if (!confirm(`Delete “${t.title}”?`)) return;
    setBusy(t.id);
    try {
      await tickets.remove(t.id, token);
      drop(t.id);
      void load();
    } catch {
      setError(`Couldn’t delete “${t.title}”. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="backlog">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        {/* the text takes what's left, so a long "Join refinement · … is hosting" doesn't push the buttons onto their own line */}
        <div className="min-w-0 flex-1 basis-80">
          {/* the Backlog tab names it (TL-385) */}
          <p className="text-sm text-muted-foreground">Tickets not on a board yet. Move one to a board to put it in that team&apos;s sprint, or refine to plan the next sprints.</p>
        </div>
        {refining && session.session && session.role !== 'outside' && (
          <HostedBar session={session.session} role={session.role} following={session.following} people={people} noun="refinement"
            onFollow={session.setFollowing} onLeave={doneRefining} onEnd={doneRefining} onHandOver={session.handOver} />
        )}
        {!refining && (
          <div className="ml-auto flex shrink-0 gap-2">
            {(session.session || canRefine(role, boards)) && <Button variant="outline" onClick={() => void refine()}>{refineLabel(session.session)}</Button>}
            <Button variant="outline" onClick={() => setAdding(true)}>Add to backlog</Button>
          </div>
        )}
      </div>
      {refining && <FollowedTicket ticketId={followedTicket(session.session, session.role, session.following)} token={token} onDismiss={() => session.setFollowing(false)} />}
      {refining ? (
        <RefinementMode
          projectId={projectId} boards={boards} token={token} version={changes}
          priorities={priorityFilter} onPrioritiesChange={changePriorities}
          onClose={doneRefining}
          onOpen={(t, scale) => openEditor(t as unknown as BacklogTicket, scale)}
          ticketActions={(t) => (
            <>
              {boards.length > 0 && (
                <Select items={Object.fromEntries(boards.map((b) => [b.id, b.name]))} value={null} onValueChange={(v) => v && moveTo(t, String(v))} disabled={busy === t.id}>
                  <SelectTrigger size="sm" aria-label={`Move “${t.title}” to a board`}>
                    <SelectValue placeholder={busy === t.id ? 'Moving…' : 'Move to board…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === t.id} onClick={() => remove(t)}>Delete</Button>
            </>
          )}
        />
      ) : <>

      <div role="group" aria-label="Filter by type" className="mb-3 flex gap-1">
        {(['all', ...TYPES.map((t) => t.value)] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'ghost'} aria-pressed={filter === f} onClick={() => changeFilter(f)}>
            {f === 'all' ? 'All' : TYPES.find((t) => t.value === f)!.label + 's'}
            {data && <span className="text-muted-foreground">{data.counts[f]}</span>}
          </Button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <LabelFilter options={data?.labels ?? null} labels={labelFilter} onLabelsChange={changeLabels} syncUrl={false} />
        <span className="ml-2 inline-flex"><PriorityFilter priorities={priorityFilter} onPrioritiesChange={changePriorities} /></span>
        <span className="inline-flex"><EpicFilter epics={epics} epic={epicFilter} onEpicChange={changeEpic} /></span>
        <span className="ml-auto inline-flex items-center gap-2 pl-2 text-sm text-muted-foreground">
          <label htmlFor="backlog-status">Show</label>
          <Select items={STATUS_LABEL} value={status} onValueChange={(value) => { if (value) { setStatus(value as BacklogStatus); setPage(1); } }}>
            <SelectTrigger id="backlog-status" size="sm" aria-label="Show open or closed tickets">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as BacklogStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </span>
        <span className="inline-flex items-center gap-2 pl-2 text-sm text-muted-foreground">
          <label htmlFor="backlog-sort">Sort</label>
          <Select value={sort} onValueChange={(value) => { if (value) { setSort(value as BacklogSort); setPage(1); } }}>
            <SelectTrigger id="backlog-sort" size="sm" aria-label="Sort backlog by date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{status === 'open' ? 'Manual order' : 'Recently closed'}</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </span>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {failed ? (
        <p role="alert" className="text-sm text-destructive">Couldn&apos;t load the backlog. Please refresh to try again.</p>
      ) : data === null ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {status !== 'open' && !(labelFilter.length > 0 || priorityFilter.length > 0 || epicFilter) && filter === 'all' ? `No ${STATUS_EMPTY[status]} tickets in the backlog.`
            : labelFilter.length > 0 || priorityFilter.length > 0 || epicFilter ? (
            <span className="flex flex-wrap items-center gap-2">No tickets match these filters.<Button type="button" size="sm" variant="link" className="h-auto p-0" onClick={clearFilters}>Clear filters</Button></span>
          ) : data.counts.all === 0 ? 'The backlog is empty.' : filter !== 'all' ? (
            <span className="flex flex-wrap items-center gap-2">Nothing of this type in the backlog.<Button type="button" size="sm" variant="link" className="h-auto p-0" onClick={clearFilters}>Clear filters</Button></span>
          ) : 'The backlog is empty.'}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((t) => (
            <BacklogRow key={t.id} t={t} busy={busy === t.id} onEdit={() => openEditor(t)} />
          ))}
        </ul>
      )}
      <Pager page={page} lastPage={lastPage} onPage={setPage} anchor="#backlog" />
      </>}

      {sizing && (
        <SizeDialog
          ticket={sizing.ticket}
          board={sizing.board}
          onCancel={() => setSizing(null)}
          onMove={(estimate) => { setSizing(null); void moveTo(sizing.ticket, sizing.board.id, estimate); }}
        />
      )}
      {editing && (
        // same dialog as on boards; backlog tickets have no column, which only matters when creating
        <TicketDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          token={token}
          projectId={projectId}
          columnId=""
          ticket={editing as unknown as Ticket}
          scale={editScale}
          onSaved={(nt) => { setData((d) => d && { ...d, tickets: d.tickets.map((x) => (x.id === nt.id ? { ...x, ...nt, column_id: null, type: nt.type ?? x.type } : x)) }); void load(); }}
          onDeleted={(id) => { drop(id); void load(); }} // the edit dialog can delete (it asks first)
          onWontDo={(id) => { drop(id); void load(); }}
        />
      )}
      <AddDialog
        open={adding}
        onOpenChange={setAdding}
        projectId={projectId}
        token={token}
        onAdd={async ({ files, ...input }) => {
          const t = await backlog.create(projectId, input, token);
          if (await attachAll(t.id, files, token)) setError(`“${t.title}” was added, but some files didn’t attach — add them from the ticket.`);
          void load(); // lands wherever the server orders it
        }}
      />
    </section>
  );
}

function AddDialog({ open, onOpenChange, projectId, token, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  projectId: string; token: string;
  onAdd: (t: { title: string; description: string; type: TicketType; labels: string[]; files: PendingFile[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('bug');
  const [labels, setLabels] = useState<string[]>([]);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const similar = useSimilarTickets(title, projectId, token, open);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onAdd({ title: title.trim(), description: description.trim(), type, labels, files });
      setFiles([]);
      setTitle('');
      setDescription('');
      setLabels([]);
      onOpenChange(false);
    } catch {
      setError('Couldn’t add the ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${TICKET_DIALOG_WIDTH}`}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add to backlog</DialogTitle>
            <DialogDescription>It stays here until you move it onto a team board.</DialogDescription>
          </DialogHeader>
          <TypePicker value={type} onChange={setType} />
          <LabelDrawer projectId={projectId} token={token} labels={labels} onChange={setLabels} disabled={saving} />
          <Input autoFocus required maxLength={200} placeholder="What's wrong / what's needed?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <SimilarTickets suggestions={similar} description={description} />
          <MarkdownTextarea
            placeholder="Details, steps to reproduce… (optional)"
            value={description}
            mentions={token}
            onChange={(e) => setDescription(e.target.value)}
          />
          <PendingAttachments files={files} onChange={setFiles} projectId={projectId} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add to backlog'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// SizeDialog asks for an estimate on the target board's scale before a backlog ticket moves onto it.
function SizeDialog({ ticket, board, onCancel, onMove }: {
  ticket: BacklogTicket; board: Board; onCancel: () => void; onMove: (estimate: string) => void;
}) {
  const [estimate, setEstimate] = useState('');
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); if (estimate) onMove(estimate); }} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Estimate “{ticket.title}”</DialogTitle>
            <DialogDescription>{board.name} estimates every ticket, so size this one before it joins the board.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            Estimate
            <EstimateSelect scale={board.estimate_scale ?? 'none'} value={estimate} onChange={setEstimate} required />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!estimate}>Move to {board.name}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// BacklogRow: one backlog line (TL-174): key, type and age on the left; labels with the extra ones
// under them, beside the title; the description underneath; Edit on the right.
// the backlog's Show picker, and how a closed ticket was closed
export const STATUS_LABEL: Record<BacklogStatus, string> = { open: 'Open', done: 'Done', wont_do: 'Won’t do', duplicate: 'Duplicates', closed: 'All closed' };
const STATUS_EMPTY: Record<BacklogStatus, string> = { open: 'open', done: 'done', wont_do: 'won’t do', duplicate: 'duplicate', closed: 'closed' };
const RESOLUTION_LABEL = { done: 'Done', wont_do: 'Won’t do', duplicate: 'Duplicate' } as const;

export function BacklogRow({ t, busy, onEdit }: { t: BacklogTicket; busy: boolean; onEdit: () => void }) {
  const [shown, rest] = splitLabels(t.labels, 2);
  // TL-177 layout, a grid: key and type on the left with the two shown labels stacked beside them,
  // the +N then the title centred across those two rows; "Created …" under the left column and the
  // description under the +N and title; Edit pinned top right, the date bottom left.
  return (
    <li className="grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 p-4">
      <span className={`col-start-1 row-start-1 ${t.duplicate_of_id ? 'line-through' : ''}`}><TicketKey value={t.key} /></span>
      <span className="col-start-1 row-start-2 flex flex-wrap gap-1"><TypeBadge type={t.type} />{t.blocked && <BlockedBadge />}{t.resolution && <Badge variant="secondary">{RESOLUTION_LABEL[t.resolution]}</Badge>}</span>
      {t.created_at && <span className="col-span-2 col-start-1 row-start-3 self-end text-xs whitespace-nowrap text-muted-foreground">Created <When iso={t.created_at} /></span>}
      {shown.length > 0 && <TicketLabels labels={shown} className="col-start-2 row-span-2 row-start-1 flex-col items-start" />}
      {rest.length > 0 && <span className="col-start-3 row-span-2 row-start-1"><MoreLabels labels={rest} /></span>}
      <span className="col-start-4 row-span-2 row-start-1 min-w-0">
        <Link href={ticketPath(t)} className={`font-medium hover:underline ${t.duplicate_of_id ? 'line-through text-muted-foreground' : ''}`}>{t.title}</Link>
        {t.duplicate_of_key && <span className="ml-2 text-xs text-muted-foreground">Duplicate of {t.duplicate_of_key}</span>}
      </span>
      {t.description && <p className="col-span-2 col-start-3 row-start-3 line-clamp-1 text-sm text-muted-foreground">{plainText(t.description)}</p>}
      {/* moving to a board and deleting are planning decisions: they live in refine mode */}
      <Button size="sm" variant="ghost" className="col-start-5 row-start-1 self-start justify-self-end" disabled={busy} onClick={onEdit}>Edit</Button>
    </li>
  );
}
