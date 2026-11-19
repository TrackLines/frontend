'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { ArchiveIcon, ChevronDownIcon } from 'lucide-react';
import { When } from '@/components/common/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, projects as projectApi, teams as teamApi, type Project, type Team } from '@/lib/api';

export type ProjectAction = 'delete' | 'archive' | 'restore';

// projectAction: never used → delete; used → archive (history kept); archived → restore (TL-907).
export function projectAction(p: Pick<Project, 'deletable' | 'archived_at'>): ProjectAction {
  if (p.archived_at) return 'restore';
  return p.deletable ? 'delete' : 'archive';
}

type Data = { active: Project[]; archived: Project[]; teams: Team[]; owners: Record<string, string[]> };

// ManageProjects: the org's projects for admins (TL-908): archive, restore, delete, and which teams own each.
export function ManageProjects({ token }: { token: string }) {
  const { t } = useLingui();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [active, archived, teams] = await Promise.all([projectApi.list(token), projectApi.archived(token), teamApi.list(token)]);
    const owners = Object.fromEntries(await Promise.all([...active, ...archived].map(async (p) =>
      [p.id, (await teamApi.projectTeams(p.id, token)).map((team) => team.id)] as const)));
    setData({ active, archived, teams, owners });
  }
  useEffect(() => { load().catch(() => setError(t`Couldn’t load projects.`)); }, [token]);

  async function run(key: string, action: () => Promise<unknown>, failed: string) {
    setBusy(key);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? err.message : failed);
    } finally {
      setBusy(null);
    }
  }

  function onAction(p: Project) {
    const name = p.name;
    const action = projectAction(p);
    if (action === 'delete' && !confirm(t`Delete “${name}”? It has never been used, so nothing is lost.`)) return;
    if (action === 'archive' && !confirm(t`Archive “${name}”? It leaves the project list and its sprints close, but its history is kept and you can restore it here.`)) return;
    const call = action === 'delete' ? projectApi.remove : action === 'archive' ? projectApi.archive : projectApi.restore;
    void run(p.id, () => call(p.id, token),
      action === 'delete' ? t`Couldn’t delete ${name}. Please try again.` : action === 'archive' ? t`Couldn’t archive ${name}. Please try again.` : t`Couldn’t restore ${name}. Please try again.`);
  }

  function onToggleTeam(p: Project, team: Team, owns: boolean) {
    void run(p.id, () => owns ? teamApi.removeProject(p.id, team.id, token) : teamApi.addProject(p.id, team.id, token), t`Couldn’t change the project’s teams. Please try again.`);
  }

  return <ManageProjectsView data={data} error={error} busy={busy} onAction={onAction} onToggleTeam={onToggleTeam} />;
}

// ManageProjectsView: pure, for tests.
export function ManageProjectsView({ data, error, busy, onAction, onToggleTeam }: {
  data: Data | null; error: string; busy: string | null;
  onAction: (p: Project) => void; onToggleTeam: (p: Project, team: Team, owns: boolean) => void;
}) {
  return (
    <div className="grid gap-8">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {data === null ? (!error && <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>) : <>
        <section>
          <h2 className="mb-3 text-lg font-semibold"><Trans>Projects</Trans></h2>
          {data.active.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"><Trans>No projects yet.</Trans></p>
            : <ProjectTable list={data.active} {...{ data, busy, onAction, onToggleTeam }} />}
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><ArchiveIcon className="size-4" aria-hidden /><Trans>Archived</Trans></h2>
          {data.archived.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"><Trans>No archived projects.</Trans></p>
            : <ProjectTable list={data.archived} {...{ data, busy, onAction, onToggleTeam }} />}
        </section>
      </>}
    </div>
  );
}

function ProjectTable({ list, data, busy, onAction, onToggleTeam }: {
  list: Project[]; data: Data; busy: string | null;
  onAction: (p: Project) => void; onToggleTeam: (p: Project, team: Team, owns: boolean) => void;
}) {
  const { t } = useLingui();
  const label: Record<ProjectAction, string> = { delete: t`Delete`, archive: t`Archive`, restore: t`Restore` };
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Trans>Project</Trans></TableHead>
            <TableHead><Trans>Key</Trans></TableHead>
            <TableHead><Trans>Tickets</Trans></TableHead>
            <TableHead><Trans>Owning teams</Trans></TableHead>
            <TableHead className="text-right"><span className="sr-only"><Trans>Actions</Trans></span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((p) => {
            const owners = data.teams.filter((team) => data.owners[p.id]?.includes(team.id));
            const action = projectAction(p);
            const name = p.name;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  {p.archived_at && <p className="text-xs text-muted-foreground"><Trans>Archived <When iso={p.archived_at} /></Trans></p>}
                </TableCell>
                <TableCell className="font-mono text-xs">{p.key_prefix}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.stats ? <Trans>{p.stats.open + p.stats.backlog} open · {p.stats.done} done</Trans> : '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={t`Owning teams of ${name}`} disabled={busy === p.id || data.teams.length === 0} />}>
                      {owners.length === 0 ? <span className="text-muted-foreground">{data.teams.length === 0 ? t`No teams yet` : t`No team`}</span>
                        : <span className="flex flex-wrap gap-1">{owners.map((team) => <Badge key={team.id} variant="secondary">{team.name}</Badge>)}</span>}
                      <ChevronDownIcon aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {data.teams.map((team) => {
                        const owns = data.owners[p.id]?.includes(team.id) ?? false;
                        return <DropdownMenuCheckboxItem key={team.id} checked={owns} onCheckedChange={() => onToggleTeam(p, team, owns)}>{team.name}</DropdownMenuCheckboxItem>;
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className={action === 'delete' ? 'text-destructive' : ''} disabled={busy === p.id} onClick={() => onAction(p)}>{label[action]}</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
