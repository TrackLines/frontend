'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImportStatus, importActions } from '@/components/settings/csv-import';
import { ImportPreview, useAct } from '@/components/settings/jira-import';
import { importsApi, linear, projects as projectsApi, teams as teamsApi, type ImportJob, type LinearConnection, type Team } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { useToken } from '@/lib/hooks/use-token';

export const LINEAR_KEYS = 'https://linear.app/settings/account/security';

// LinearImport: connect Linear with a personal API key, preview the workspace as one project (TL-655),
// then run, follow and scrap it like the other imports.
export function LinearImport() {
  const token = useToken();
  const { t } = useLingui();
  const [conn, setConn] = useState<LinearConnection | null | undefined>(undefined);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    if (!token) return;
    linear.connection(token).then(setConn, () => setProblem(t`Couldn’t check your Linear connection. Please try again.`));
  }, [token !== null]);
  if (conn === undefined || !token) return <p role="status" className="text-sm text-muted-foreground">{problem || <Trans>Loading…</Trans>}</p>;
  return (
    <div className="grid gap-8">
      <LinearConnectionPanel conn={conn} token={token} onChange={setConn} />
      {conn && <LinearPicker token={token} workspace={conn.workspace} />}
    </div>
  );
}

// LinearConnectionPanel: the personal API key; once connected, the workspace, whose key, when it's
// deleted, with Extend (30 more days) and Delete.
export function LinearConnectionPanel({ conn, token, onChange }: { conn: LinearConnection | null; token: string; onChange: (c: LinearConnection | null) => void }) {
  const { t, i18n } = useLingui();
  const { busy, error, act } = useAct();
  const [key, setKey] = useState('');
  if (conn) {
    const until = dates(i18n, { dateStyle: 'medium' }).format(new Date(conn.expires_at));
    return (
      <section aria-labelledby="linear-connection" className="grid gap-3 rounded-lg border p-4 text-sm" data-linear-connected>
        <h2 id="linear-connection" className="font-semibold"><Trans>Linear connection</Trans></h2>
        <p><Trans>Connected to the <strong>{conn.workspace}</strong> workspace with {conn.account}’s key.</Trans></p>
        <p className="text-muted-foreground"><Trans>The API key is kept, encrypted, until {until}, then deleted. Extend it if you need longer.</Trans></p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(async () => onChange(await linear.extend(token)))}><Trans>Keep it 30 more days</Trans></Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => {
            if (window.confirm(t`Delete the Linear connection? Its API key is forgotten.`)) void act(async () => { await linear.disconnect(token); onChange(null); });
          }}><Trans>Delete</Trans></Button>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="linear-connection" className="grid gap-3 rounded-lg border p-4 text-sm">
      <h2 id="linear-connection" className="font-semibold"><Trans>Connect Linear</Trans></h2>
      <p className="text-muted-foreground">
        <Trans>Use a personal API key: <a href={LINEAR_KEYS} target="_blank" rel="noreferrer" className="underline">create one in Linear</a> under Security &amp; access. TrackLin.es keeps it, encrypted, for 30 days.</Trans>
      </p>
      <label className="grid gap-1.5 font-medium"><Trans>API key</Trans>
        <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" placeholder="lin_api_…" />
      </label>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button className="w-fit" disabled={busy || !key.trim()} onClick={() => void act(async () => { onChange(await linear.connect(key, token)); setKey(''); })}>
        <Trans>Connect</Trans>
      </Button>
    </section>
  );
}

const WORKSPACE = 'workspace'; // the one project's key in the preview's prefix map

// LinearPicker: the whole workspace in one go: preview (prefix, teams), import, follow, scrap.
function LinearPicker({ token, workspace }: { token: string; workspace: string }) {
  const { t } = useLingui();
  const { busy, error, act } = useAct();
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [prefixes, setPrefixes] = useState<Record<string, string>>({});
  const [teamOf, setTeamOf] = useState<Record<string, string>>({});
  const [job, setJob] = useState<ImportJob | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    teamsApi.list(token).then(setTeamList, () => {});
    projectsApi.list(token).then((ps) => setTaken(ps.map((p) => p.key_prefix ?? '').filter(Boolean)), () => {});
  }, []);
  useEffect(() => { // a running import is followed until it finishes
    if (!job || (job.state !== 'running' && job.state !== 'cancelling')) return;
    const timer = setTimeout(() => void importsApi.get(job.id, token).then(setJob, () => {}), 1500);
    return () => clearTimeout(timer);
  }, [job]);
  function preview() {
    void act(async () => {
      if (job?.state === 'previewing') void importsApi.cancel(job.id, token).catch(() => {});
      setJob(await linear.preview({ prefix: prefixes[WORKSPACE] || undefined, teams: teamOf }, token));
      setStale(false);
    });
  }
  const change = <V,>(set: (f: (m: Record<string, V>) => Record<string, V>) => void) => (k: string, v: V) => { set((m) => ({ ...m, [k]: v })); setStale(true); };
  const keyOf = Object.fromEntries((job?.projects ?? []).map((p) => [p.source_id ?? '', WORKSPACE]));
  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground"><Trans>The whole {workspace} workspace becomes one project: each team a board, each Linear project an epic. The team with the most issues keeps its key and numbers; the others are numbered after it.</Trans></p>
      <Button className="w-fit" disabled={busy} onClick={preview}>{job ? <Trans>Preview again</Trans> : <Trans>Preview</Trans>}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {job?.state === 'previewing' && (
        <ImportPreview job={job} keyOf={keyOf} teams={teamList} taken={taken} prefixes={prefixes} teamOf={teamOf} stale={stale} single
          setPrefix={change(setPrefixes)} setTeam={change(setTeamOf)} />
      )}
      {job && <ImportStatus job={job} busy={busy} summary={false} blocked={stale || (job.problems?.length ?? 0) > 0}
        onRun={() => void act(async () => setJob(await importsApi.run(job.id, token)))}
        {...importActions(job, token, act, setJob, t`Scrap this import? Everything it made is deleted.`)} />}
    </div>
  );
}
