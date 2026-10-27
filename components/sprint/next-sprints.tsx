'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { PlannedSprintCard } from '@/components/project/refinement';
import { ApiError, plannedSprints, type Board, type PlannedSprint } from '@/lib/api';

// NextSprints: the board's planned sprints (TL-584), each with its goal, how full it is and its
// tickets, the same cards as refinement. Planned tickets stay in the backlog until their sprint
// starts, so they don't count toward this sprint's scope; this is where the board shows them.
// Admins and the team's leaders can size, take out and approve; everyone else reads.
export function NextSprints({ board, token, canManage }: { board: Board; token: string; canManage: boolean }) {
  const { t } = useLingui();
  const [plans, setPlans] = useState<PlannedSprint[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => plannedSprints.list(board.id, token).then(setPlans);
  useEffect(() => { load().catch(() => setError(t`Couldn’t load the next sprints. Please try again.`)); }, [board.id]); // token refreshes must not refetch

  async function act(change: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await change();
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 ? err.message : failed);
    } finally {
      setBusy(false);
    }
  }
  return <NextSprintsView board={board} plans={plans} error={error} canManage={canManage} busy={busy} token={token} act={act} />;
}

// NextSprintsView: the cards, or loading / nothing planned (pure, for tests).
export function NextSprintsView({ board, plans, error, canManage, busy, token, act }: {
  board: Board; plans: PlannedSprint[] | null; error: string; canManage: boolean; busy: boolean; token: string;
  act: (change: () => Promise<unknown>, failed: string) => Promise<void>;
}) {
  return (
    <section className="grid gap-4 px-6 py-4">
      <p className="text-sm text-muted-foreground">
        <Trans>Tickets planned for this board’s next sprints. They join the board when their sprint starts. Plan more with <Link href={`/projects/${board.project_id}`} className="underline">Refine</Link> on the project’s backlog.</Trans>
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {plans === null ? (!error && <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>)
        : plans.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"><Trans>No sprints are planned yet.</Trans></p>
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => <PlannedSprintCard key={p.id} plan={p} scale={board.estimate_scale ?? 'none'} canManage={canManage} busy={busy} token={token} act={act} />)}
          </div>
        )}
    </section>
  );
}
