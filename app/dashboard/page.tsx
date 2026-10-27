'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardWork } from '@/components/work/dashboard-work';
import { NameDialog } from '@/components/common/name-dialog';
import { atProjectLimit, UpgradeDialog } from '@/components/billing/upgrade-dialog';
import { ProjectCard } from '@/components/project/project-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loading } from '@/components/layout/page-skeletons';
import { FolderKanbanIcon, PlusIcon } from 'lucide-react';
import { projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';
import { useCachedState } from '@/lib/api/page-cache';
import { emitGuideAction } from '@/lib/org/guide-tour';

// Signed-in home: your projects. A project holds a board per team plus its roadmaps.
export default function Dashboard() {
  const { t } = useLingui();
  const router = useRouter();
  const token = useToken();
  const [list, setList] = useCachedState<Project[]>('projects'); // last-seen list shows instantly, then refreshes
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [atLimit, setAtLimit] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) projects.list(token).then(setList, () => setFailed(true));
  }, [loaded]); // load once; token refreshes must not refetch

  async function create(name: string) {
    try {
      const p = await projects.create({ name }, token);
      emitGuideAction({ type: 'project-created', projectId: p.id });
      router.push(`/projects/${p.id}`);
    } catch (err) {
      if (!atProjectLimit(err)) throw new Error(t`Couldn’t create the project. Please try again.`);
      setCreating(false);
      emitGuideAction({ type: 'project-dialog-closed' });
      setAtLimit(true);
    }
  }

  if (failed) return <p className="p-8 text-destructive" role="alert"><Trans>Couldn&apos;t load your projects. Please refresh to try again.</Trans></p>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><Trans>Projects</Trans></h1>
          <p className="mt-1 text-sm text-muted-foreground"><Trans>Everyone in your organization sees these.</Trans></p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/roadmaps" className={buttonVariants({ variant: 'ghost' })}><Trans>Roadmaps</Trans></Link>
          <Link href="/settings" className={buttonVariants({ variant: 'ghost' })}><Trans>Settings</Trans></Link>
          <Button data-guide="new-project" onClick={() => setCreating(true)} disabled={!token}><PlusIcon /><Trans>New project</Trans></Button>
        </div>
      </header>
      {token && <DashboardWork token={token} />}
      {!list ? (
        <Loading label={t`Loading projects…`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </Loading>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <FolderKanbanIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold"><Trans>Start your first project</Trans></h2>
          <p className="mx-auto mt-1 mb-6 max-w-md text-sm text-muted-foreground"><Trans>A project holds a board for each team, a shared backlog, and the roadmaps you send to customers.</Trans></p>
          <Button onClick={() => setCreating(true)} disabled={!token}><Trans>Create a project</Trans></Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProjectCard key={p.id} project={p} />)}
        </ul>
      )}
      {token && (
        <>
          <NameDialog
            guide="project"
            open={creating}
            onOpenChange={(open) => { setCreating(open); if (!open) emitGuideAction({ type: 'project-dialog-closed' }); }}
            title={t`New project`}
            description={t`You can add a board for each team inside it.`}
            placeholder={t`e.g. Website relaunch`}
            submitLabel={t`Create project`}
            onSubmit={create}
          />
          <UpgradeDialog open={atLimit} onOpenChange={setAtLimit} token={token} />
        </>
      )}
    </main>
  );
}
