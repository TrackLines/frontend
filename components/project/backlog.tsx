'use client';

import { When } from '@/components/when';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { TICKET_TYPES as TYPES, TypeBadge, TypePicker } from '@/components/ticket-type';
import { TICKET_DIALOG_WIDTH, TicketDialog } from '@/components/board/ticket-dialog';
import { EstimateSelect } from '@/components/board/estimate';
import { RefinementMode } from '@/components/project/refinement';
import type { EstimateScale } from '@/lib/estimates';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { LabelDrawer, TicketLabels } from '@/components/ticket/labels';
import { attachAll, PendingAttachments, type PendingFile } from '@/components/ticket/pending-attachments';
import { BACKLOG_CHANGED } from '@/components/quick-add-ticket';
import { ApiError, backlog, BacklogTicket, type BacklogPage, boards as boardsApi, tickets, type Board, type Ticket, type TicketType } from '@/lib/api';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useCachedState } from '@/lib/page-cache';
import { ListSkeleton } from '@/components/page-skeletons';
import { LabelFilter } from '@/components/board/label-filter';
import { pageItems } from '@/lib/pagination';

type Props = { projectId: string; boards: Board[]; token: string };

const PER_PAGE = 25;

// Backlog: tickets in the project that aren't on any board or sprint yet (e.g. triaged bugs).
export function Backlog({ projectId, boards, token }: Props) {
  const [data, setData] = useCachedState<BacklogPage>(`backlog-page:${projectId}`); // instant on revisit, refreshed on mount
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<TicketType | 'all'>('all');
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
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

  // server does the filtering, ordering (ready first, blocked after) and paging; only the latest request may land
  const latest = useRef(0);
  const load = async (quiet = false) => {
    const req = ++latest.current;
    try {
      const d = await backlog.page(projectId, { type: filter === 'all' ? undefined : filter, labels: labelFilter, page, perPage: PER_PAGE }, token);
      if (req !== latest.current) return;
      const last = Math.max(1, Math.ceil(d.counts[filter] / PER_PAGE));
      if (page > last) return setPage(last); // e.g. the last ticket on the last page moved away
      setData(d);
      setFailed(false);
      setChanges((c) => c + 1);
    } catch {
      // keep already-rendered data during transient failures
      if (req === latest.current && (!quiet || data === null)) setFailed(true);
    }
  };
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }); // declared before the effects that call it, so they see this render's filters

  useEffect(() => { void loadRef.current(); }, [projectId, filter, labelFilter, page]); // token refreshes must not refetch
  useEffect(() => {
    const onChange = (e: Event) => { if ((e as CustomEvent).detail?.projectId === projectId) void loadRef.current(); };
    window.addEventListener(BACKLOG_CHANGED, onChange);
    return () => window.removeEventListener(BACKLOG_CHANGED, onChange);
  }, [projectId]);

  useAutoRefresh(() => load(true), !adding && !editing && !refining && busy === null);

  const shown = data?.tickets ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.counts[filter] / PER_PAGE)) : 1;
  const changeFilter = (f: TicketType | 'all') => { setFilter(f); setPage(1); };
  const changeLabels = (l: string[]) => { setLabelFilter(l); setPage(1); };
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
    <section id="backlog" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Backlog</h2>
          <p className="text-sm text-muted-foreground">Tickets not on a board yet. Move one to a board to put it in that team&apos;s sprint, or refine to plan the next sprints.</p>
        </div>
        {!refining && (
          <div className="flex gap-2">
            {boards.some((b) => b.style !== 'kanban') && <Button variant="outline" onClick={() => setRefining(true)}>Refine</Button>}
            <Button variant="outline" onClick={() => setAdding(true)}>Add to backlog</Button>
          </div>
        )}
      </div>
      {refining ? (
        <RefinementMode
          projectId={projectId} boards={boards} token={token} version={changes}
          onClose={() => { setRefining(false); void load(); }}
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
      <div className="mb-3">
        <LabelFilter options={data?.labels ?? null} labels={labelFilter} onLabelsChange={changeLabels} />
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {failed ? (
        <p role="alert" className="text-sm text-destructive">Couldn&apos;t load the backlog. Please refresh to try again.</p>
      ) : data === null ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {labelFilter.length > 0 ? 'No tickets with these labels in the backlog.' : data.counts.all === 0 ? 'The backlog is empty.' : 'Nothing of this type in the backlog.'}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
              <TypeBadge type={t.type} />
              {t.blocked && <BlockedBadge />}
              <TicketLabels labels={t.labels} />
              <div className="min-w-0 flex-1">
                <Link href={`/tickets/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                {t.description && <p className="line-clamp-1 text-sm text-muted-foreground">{t.description}</p>}
                {t.created_at && <p className="text-xs text-muted-foreground">Created <When iso={t.created_at} /></p>}
              </div>
              {/* moving to a board and deleting are planning decisions: they live in refine mode */}
              <Button size="sm" variant="ghost" disabled={busy === t.id} onClick={() => openEditor(t)}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
      {lastPage > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#backlog" aria-disabled={page === 1} className={page === 1 ? 'pointer-events-none opacity-50' : undefined} onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} />
            </PaginationItem>
            {pageItems(page, lastPage).map((p, i) => (
              <PaginationItem key={p === 'gap' ? `gap${i}` : p}>
                {p === 'gap' ? <PaginationEllipsis /> : (
                  <PaginationLink href="#backlog" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href="#backlog" aria-disabled={page === lastPage} className={page === lastPage ? 'pointer-events-none opacity-50' : undefined} onClick={(e) => { e.preventDefault(); if (page < lastPage) setPage(page + 1); }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
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
          onDeleted={refining ? (id) => { drop(id); void load(); } : undefined} // deleting is a refine-mode decision
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
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Details, steps to reproduce… (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <PendingAttachments files={files} onChange={setFiles} />
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
