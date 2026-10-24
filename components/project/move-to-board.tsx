'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { EstimateSelect } from '@/components/board/estimate';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, boards as boardsApi, plannedSprints, sprints, tickets, type Board, type PlannedSprint, type Velocity } from '@/lib/api';
import { scaleValues, type EstimateScale } from '@/lib/estimates';
import { fullness, moveTargets, overNote } from '@/lib/move-to-board';

type Loaded = { board: Board; velocity?: Velocity; planned: PlannedSprint[] }; // no velocity: a kanban board

// MoveToBoard: the ticket edit dialog's "Move to board" (TL-464), refinement's move without a session.
// Pick a board, then (on a sprint board) the current sprint or a planned one, each with how full it is.
// Past capacity it says so and asks again: "Move anyway", or for a planned sprint, that it'll need
// approval. Boards with an estimate scale take an estimate first. Moving to the current sprint puts it
// at the bottom of the first column; planning keeps it in the backlog, planned (as refinement does).
export function MoveToBoard({ ticket, boards, token, onMoved, onCancel, fromBoard = false, alsoMoves = '' }: {
  ticket: { id: string; title: string; estimate?: string | null };
  boards: Board[]; token: string; onMoved: (planned: boolean) => void; onCancel: () => void;
  fromBoard?: boolean; // the ticket is on a board: only the current sprint, as only backlog tickets can be planned (TL-381)
  alsoMoves?: string; // "Moving it also moves its 2 open sub-tickets…" (TL-381)
}) {
  const { t, i18n } = useLingui();
  const [boardId, setBoardId] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [targetId, setTargetId] = useState('');
  const [estimate, setEstimate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const scale = (loaded?.board.estimate_scale ?? 'none') as EstimateScale;
  const sprintBoard = loaded?.board.style !== 'kanban';
  useEffect(() => {
    if (!boardId) return;
    setLoaded(null); setTargetId(''); setError('');
    (async () => {
      const board = await boardsApi.get(boardId, token);
      const s = (board.estimate_scale ?? 'none') as EstimateScale;
      setEstimate(ticket.estimate && scaleValues(s).includes(ticket.estimate) ? ticket.estimate : '');
      if (board.style === 'kanban') return setLoaded({ board, planned: [] });
      const [v, planned] = await Promise.all([sprints.velocity(boardId, token), fromBoard ? [] : plannedSprints.list(boardId, token)]);
      setLoaded({ board, velocity: v, planned });
    })().catch(() => setError(t`Couldn’t load that board. Please try again.`));
  }, [boardId]);

  // counted with the estimate picked here, which is what the move sends
  const targets = loaded?.velocity ? moveTargets(loaded.velocity, loaded.planned, scale === 'none' ? ticket.estimate : estimate, i18n) : [];
  const target = targets.find((x) => x.id === targetId);
  const note = target && overNote(target, i18n);
  const needsEstimate = scale !== 'none' && !estimate;
  const ready = !!loaded && !needsEstimate && (!sprintBoard || targets.length === 0 || !!target);

  async function move() {
    if (!loaded) return;
    setBusy(true); setError('');
    const est = scale !== 'none' ? estimate : undefined;
    try {
      if (target && target.id !== 'current') {
        await plannedSprints.planTicket(ticket.id, target.id, token, est);
        onMoved(true);
      } else {
        const first = loaded.board.columns?.[0];
        if (!first) throw new Error('board has no columns');
        await tickets.move(ticket.id, first.id, first.tickets.length, token, est);
        onMoved(false);
      }
    } catch (err) {
      // 409: the sprint ends today (scope locked); 400: e.g. estimate required. The backend says which.
      setError(err instanceof ApiError && err.status < 500 ? err.message : t`Couldn’t move “${ticket.title}”. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  const action = !note ? (target && target.id !== 'current' ? t`Plan into sprint` : t`Move`) : target?.id === 'current' ? t`Move anyway` : t`Plan anyway`;
  return (
    <div role="group" aria-label={t`Move to board`} className="grid gap-3 rounded-lg border p-3 text-sm">
      <p className="font-medium"><Trans>Move to a board</Trans></p>
      <Select items={Object.fromEntries(boards.map((b) => [b.id, b.name]))} value={boardId || null} onValueChange={(v) => v && setBoardId(String(v))}>
        <SelectTrigger aria-label={t`Board`} className="w-full"><SelectValue placeholder={t`Choose a board…`} /></SelectTrigger>
        <SelectContent>{boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
      </Select>
      {boardId && !loaded && !error && <p className="text-muted-foreground"><Trans>Loading…</Trans></p>}
      {loaded && sprintBoard && targets.length === 0 && <p className="text-muted-foreground"><Trans>No sprint is open on this board: it goes to the first column.</Trans></p>}
      {targets.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-medium"><Trans>Sprint</Trans></legend>
          {targets.map((x) => (
            <label key={x.id} className="flex items-center gap-2">
              <input type="radio" name="move-target" value={x.id} checked={targetId === x.id} onChange={() => setTargetId(x.id)} />
              <span>{x.label}</span>
              <span className={x.over ? 'text-destructive' : 'text-muted-foreground'}>{fullness(x, i18n)}</span>
            </label>
          ))}
        </fieldset>
      )}
      {loaded && scale !== 'none' && (
        <label className="grid gap-1.5 font-medium">
          <Trans>Estimate <span className="font-normal text-muted-foreground">({loaded.board.name} needs one)</span></Trans>
          <EstimateSelect scale={scale} value={estimate} onChange={setEstimate} required />
        </label>
      )}
      {alsoMoves && <p role="note" className="text-xs text-muted-foreground">{alsoMoves}</p>}
      {note && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">{note}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={note ? 'destructive' : 'default'} disabled={busy || !ready} onClick={() => void move()}>{busy ? t`Moving…` : action}</Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}><Trans>Cancel</Trans></Button>
      </div>
    </div>
  );
}

