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
import { Trans as TransMessage } from '@lingui/react';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
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
import { ApiError, backlog, BacklogTicket, type BacklogPage, type BacklogPlanned, type BacklogSort, type BacklogStatus, type EpicSummary, boards as boardsApi, organization, tickets, type Board, type OrganizationRole, type Ticket, type TicketType, hostedPaths } from '@/lib/api';
import { canMoveToBoard, canRefine } from '@/lib/board-access';
import { PlannedBadge } from '@/components/ticket/planned-badge';
import { BacklogSortSelect, PlannedSelect } from './backlog-sort';
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
  const { t, i18n } = useLingui();
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
  const [planned, setPlanned] = useState<BacklogPlanned>('exclude'); // planned tickets show on their board's Next sprints (TL-584)
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // ticket id being moved/deleted
  const [refining, setRefining] = useState(false); // refinement mode: plan tickets into boards' next sprints
  const [sizing, setSizing] = useState<{ ticket: BacklogTicket; board: Board } | null>(null); // moving onto a board that needs an estimate
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<BacklogTicket | null>(null);
  const [editScale, setEditScale] = useState<EstimateScale>('none'); // a planned ticket is sized on its planned board's scale
  const [changes, setChanges] = useState(0); // bumps on every reload, so refine mode refreshes too
  const openEditor = (tk: BacklogTicket, scale: EstimateScale = 'none') => { setEditScale(scale); setEditing(tk); };

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
      setError(t`Couldn’t start the shared session; refining on your own.`);
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
      const d = await backlog.page(projectId, { type: filter === 'all' ? undefined : filter, labels: labelFilter, priorities: priorityFilter, sort, status, planned: status === 'open' ? planned : 'all', page, perPage: PER_PAGE, epic: epicFilter }, token);
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
  useEffect(() => { void loadRef.current(); }, [projectId, filter, labelFilter, priorityFilter, epicFilter, sort, status, planned, page]); // token refreshes must not refetch
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
  async function moveTo(tk: BacklogTicket, boardId: string, estimate?: string) {
    setBusy(tk.id);
    setError('');
    try {
      const target = await boardsApi.get(boardId, token);
      const first = target.columns?.[0];
      if (!first) throw new Error('board has no columns');
      if ((target.estimate_scale ?? 'none') !== 'none' && !estimate) {
        setSizing({ ticket: tk, board: target });
        return;
      }
      await tickets.move(tk.id, first.id, first.tickets.length, token, estimate);
      drop(tk.id);
      void load();
    } catch (err) {
      // 409: the sprint ends today (scope locked); 400: e.g. estimate required. The backend says which.
      setError(err instanceof ApiError && (err.status === 409 || err.status === 400) ? err.message : t`Couldn’t move “${tk.title}”. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  async function remove(tk: BacklogTicket) {
    if (!confirm(t`Delete “${tk.title}”?`)) return;
    setBusy(tk.id);
    try {
      await tickets.remove(tk.id, token);
      drop(tk.id);
      void load();
    } catch {
      setError(t`Couldn’t delete “${tk.title}”. Please try again.`);
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
          <p className="text-sm text-muted-foreground"><Trans>Tickets not on a board yet. Move one to a board to put it in that team&apos;s sprint, or refine to plan the next sprints.</Trans></p>
        </div>
        {refining && session.session && session.role !== 'outside' && (
          <HostedBar session={session.session} role={session.role} following={session.following} people={people} noun="refinement"
            onFollow={session.setFollowing} onLeave={doneRefining} onEnd={doneRefining} onHandOver={session.handOver} />
        )}
        {!refining && (
          <div className="ml-auto flex shrink-0 gap-2">
            {(session.session || canRefine(role, boards)) && <Button variant="outline" onClick={() => void refine()}>{refineLabel(session.session)}</Button>}
            <Button variant="outline" onClick={() => setAdding(true)}><Trans>Add to backlog</Trans></Button>
          </div>
        )}
      </div>
      {refining && <FollowedTicket ticketId={followedTicket(session.session, session.role, session.following)} token={token} onDismiss={() => session.setFollowing(false)} />}
      {refining ? (
        <RefinementMode
          projectId={projectId} boards={boards} token={token} version={changes}
          priorities={priorityFilter} onPrioritiesChange={changePriorities}
          sort={sort} onSortChange={setSort}
          onClose={doneRefining}
          onOpen={(tk, scale) => openEditor(tk as unknown as BacklogTicket, scale)}
          ticketActions={(tk) => (
            <>
              {boards.length > 0 && (
                <Select items={Object.fromEntries(boards.map((b) => [b.id, b.name]))} value={null} onValueChange={(v) => v && moveTo(tk, String(v))} disabled={busy === tk.id}>
                  <SelectTrigger size="sm" aria-label={t`Move “${tk.title}” to a board`}>
                    <SelectValue placeholder={busy === tk.id ? t`Moving…` : t`Move to board…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === tk.id} onClick={() => remove(tk)}><Trans>Delete</Trans></Button>
            </>
          )}
        />
      ) : <>

      <div role="group" aria-label={t`Filter by type`} className="mb-3 flex gap-1">
        {(['all', ...TYPES.map((type) => type.value)] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'ghost'} aria-pressed={filter === f} onClick={() => changeFilter(f)}>
            {f === 'all' ? t`All` : <TransMessage {...TYPES.find((type) => type.value === f)!.plural} />}
            {data && <span className="text-muted-foreground">{data.counts[f]}</span>}
          </Button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <LabelFilter options={data?.labels ?? null} labels={labelFilter} onLabelsChange={changeLabels} syncUrl={false} />
        <span className="ml-2 inline-flex"><PriorityFilter priorities={priorityFilter} onPrioritiesChange={changePriorities} /></span>
        <span className="inline-flex"><EpicFilter epics={epics} epic={epicFilter} onEpicChange={changeEpic} /></span>
        <span className="ml-auto inline-flex items-center gap-2 pl-2 text-sm text-muted-foreground">
          <label htmlFor="backlog-status"><Trans>Show</Trans></label>
          <Select items={Object.fromEntries(Object.entries(STATUS_LABEL).map(([s, label]) => [s, i18n._(label)]))} value={status} onValueChange={(value) => { if (value) { setStatus(value as BacklogStatus); setPage(1); } }}>
            <SelectTrigger id="backlog-status" size="sm" aria-label={t`Show open or closed tickets`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as BacklogStatus[]).map((s) => <SelectItem key={s} value={s}>{i18n._(STATUS_LABEL[s])}</SelectItem>)}
            </SelectContent>
          </Select>
        </span>
        {status === 'open' && <span className="inline-flex pl-2"><PlannedSelect planned={planned} onPlannedChange={(p) => { setPlanned(p); setPage(1); }} /></span>}
        <span className="inline-flex pl-2"><BacklogSortSelect sort={sort} onSortChange={(s) => { setSort(s); setPage(1); }} closed={status !== 'open'} /></span>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {failed ? (
        <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load the backlog. Please refresh to try again.</Trans></p>
      ) : data === null ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {status !== 'open' && !(labelFilter.length > 0 || priorityFilter.length > 0 || epicFilter) && filter === 'all' ? i18n._(STATUS_EMPTY[status])
            : labelFilter.length > 0 || priorityFilter.length > 0 || epicFilter ? (
            <span className="flex flex-wrap items-center gap-2"><Trans>No tickets match these filters.</Trans><Button type="button" size="sm" variant="link" className="h-auto p-0" onClick={clearFilters}><Trans>Clear filters</Trans></Button></span>
          ) : data.counts.all === 0 ? (status === 'open' && planned === 'exclude' ? t`Nothing unplanned in the backlog. Planned tickets are on their board’s Next sprints.` : t`The backlog is empty.`) : filter !== 'all' ? (
            <span className="flex flex-wrap items-center gap-2"><Trans>Nothing of this type in the backlog.</Trans><Button type="button" size="sm" variant="link" className="h-auto p-0" onClick={clearFilters}><Trans>Clear filters</Trans></Button></span>
          ) : t`The backlog is empty.`}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((tk) => (
            <BacklogRow key={tk.id} t={tk} busy={busy === tk.id} onEdit={() => openEditor(tk)} />
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
          // Move to board without a refinement session (TL-464), for the people who can refine
          move={canMoveToBoard(role, boards) ? { boards, onMoved: (id, planned) => { if (!planned) drop(id); void load(); } } : undefined}
        />
      )}
      <AddDialog
        open={adding}
        onOpenChange={setAdding}
        projectId={projectId}
        token={token}
        onAdd={async ({ files, ...input }) => {
          const tk = await backlog.create(projectId, input, token);
          if (await attachAll(tk.id, files, token)) setError(t`“${tk.title}” was added, but some files didn’t attach — add them from the ticket.`);
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
  const { t } = useLingui();
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
      setError(t`Couldn’t add the ticket. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${TICKET_DIALOG_WIDTH}`}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle><Trans>Add to backlog</Trans></DialogTitle>
            <DialogDescription><Trans>It stays here until you move it onto a team board.</Trans></DialogDescription>
          </DialogHeader>
          <TypePicker value={type} onChange={setType} />
          <LabelDrawer projectId={projectId} token={token} labels={labels} onChange={setLabels} disabled={saving} />
          <Input autoFocus required maxLength={200} placeholder={t`What's wrong / what's needed?`} value={title} onChange={(e) => setTitle(e.target.value)} />
          <SimilarTickets suggestions={similar} description={description} />
          <MarkdownTextarea
            placeholder={t`Details, steps to reproduce… (optional)`}
            value={description}
            mentions={token}
            onChange={(e) => setDescription(e.target.value)}
          />
          <PendingAttachments files={files} onChange={setFiles} projectId={projectId} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim()}>{saving ? t`Adding…` : t`Add to backlog`}</Button>
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
            <DialogTitle><Trans>Estimate “{ticket.title}”</Trans></DialogTitle>
            <DialogDescription><Trans>{board.name} estimates every ticket, so size this one before it joins the board.</Trans></DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            <Trans>Estimate</Trans>
            <EstimateSelect scale={board.estimate_scale ?? 'none'} value={estimate} onChange={setEstimate} required />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}><Trans>Cancel</Trans></Button>
            <Button type="submit" disabled={!estimate}><Trans>Move to {board.name}</Trans></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// BacklogRow: one backlog line (TL-174): key, type and age on the left; labels with the extra ones
// under them, beside the title; the description underneath; Edit on the right.
// the backlog's Show picker, and how a closed ticket was closed
export const STATUS_LABEL: Record<BacklogStatus, MessageDescriptor> = { open: msg`Open`, done: msg`Done`, wont_do: msg`Won’t do`, duplicate: msg`Duplicates`, closed: msg`All closed` };
const STATUS_EMPTY: Record<BacklogStatus, MessageDescriptor> = {
  open: msg`No open tickets in the backlog.`, done: msg`No done tickets in the backlog.`, wont_do: msg`No won’t do tickets in the backlog.`,
  duplicate: msg`No duplicate tickets in the backlog.`, closed: msg`No closed tickets in the backlog.`,
};
const RESOLUTION_LABEL = { done: msg`Done`, wont_do: msg`Won’t do`, duplicate: msg`Duplicate` } as const;

export function BacklogRow({ t: tk, busy, onEdit }: { t: BacklogTicket; busy: boolean; onEdit: () => void }) {
  const { i18n } = useLingui();
  const [shown, rest] = splitLabels(tk.labels, 2);
  // TL-177 layout, a grid: key and type on the left with the two shown labels stacked beside them,
  // the +N then the title centred across those two rows; "Created …" under the left column and the
  // description under the +N and title; Edit pinned top right, the date bottom left.
  return (
    <li className="grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 p-4">
      <span className={`col-start-1 row-start-1 ${tk.duplicate_of_id ? 'line-through' : ''}`}><TicketKey value={tk.key} /></span>
      <span className="col-start-1 row-start-2 flex flex-wrap gap-1"><TypeBadge type={tk.type} /><PlannedBadge ticket={tk} />{tk.blocked && <BlockedBadge />}{tk.resolution && <Badge variant="secondary">{i18n._(RESOLUTION_LABEL[tk.resolution])}</Badge>}</span>
      {tk.created_at && <span className="col-span-2 col-start-1 row-start-3 self-end text-xs whitespace-nowrap text-muted-foreground"><Trans>Created <When iso={tk.created_at} /></Trans></span>}
      {shown.length > 0 && <TicketLabels labels={shown} className="col-start-2 row-span-2 row-start-1 flex-col items-start" />}
      {rest.length > 0 && <span className="col-start-3 row-span-2 row-start-1"><MoreLabels labels={rest} /></span>}
      <span className="col-start-4 row-span-2 row-start-1 min-w-0">
        <Link href={ticketPath(tk)} className={`font-medium hover:underline ${tk.duplicate_of_id ? 'line-through text-muted-foreground' : ''}`}>{tk.title}</Link>
        {tk.duplicate_of_key && <span className="ml-2 text-xs text-muted-foreground"><Trans>Duplicate of {tk.duplicate_of_key}</Trans></span>}
      </span>
      {tk.description && <p className="col-span-2 col-start-3 row-start-3 line-clamp-1 text-sm text-muted-foreground">{plainText(tk.description)}</p>}
      {/* moving to a board and deleting are planning decisions: they live in refine mode */}
      <Button size="sm" variant="ghost" className="col-start-5 row-start-1 self-start justify-self-end" disabled={busy} onClick={onEdit}><Trans>Edit</Trans></Button>
    </li>
  );
}
