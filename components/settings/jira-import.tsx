'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportStatus, importActions } from '@/components/settings/csv-import';
import { ApiError, importsApi, jira, projects as projectsApi, teams as teamsApi, type ImportJob, type JiraConnection, type JiraProject, type Team } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { ATLASSIAN_TOKENS, prefixNeeded, prefixProblem } from '@/lib/jira-import';
import { useToken } from '@/lib/use-token';

const NO_TEAM = '-';

function useAct() {
  const { t } = useLingui();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function act(f: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await f();
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`That didn’t work. Please try again.`);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, act };
}

// JiraImport: connect Jira Cloud (TL-542), pick projects and preview what they make (TL-543), then
// run, follow and, while nobody has worked on it, scrap the import (TL-544).
export function JiraImport() {
  const token = useToken();
  const { t } = useLingui();
  const [conn, setConn] = useState<JiraConnection | null | undefined>(undefined);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    if (!token) return;
    jira.connection(token).then(setConn, () => setProblem(t`Couldn’t check your Jira connection. Please try again.`));
  }, [token !== null]);
  if (conn === undefined || !token) return <p role="status" className="text-sm text-muted-foreground">{problem || <Trans>Loading…</Trans>}</p>;
  return (
    <div className="grid gap-8">
      <JiraConnectionPanel conn={conn} token={token} onChange={setConn} />
      {conn && <JiraPicker token={token} />}
    </div>
  );
}

// JiraConnectionPanel: the site, email and API token an import reads Jira with; once connected, whose
// it is and when it's deleted, with Extend (30 more days) and Delete.
export function JiraConnectionPanel({ conn, token, onChange }: { conn: JiraConnection | null; token: string; onChange: (c: JiraConnection | null) => void }) {
  const { t, i18n } = useLingui();
  const { busy, error, act } = useAct();
  const [site, setSite] = useState('');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  if (conn) {
    const until = dates(i18n, { dateStyle: 'medium' }).format(new Date(conn.expires_at));
    return (
      <section aria-labelledby="jira-connection" className="grid gap-3 rounded-lg border p-4 text-sm" data-jira-connected>
        <h2 id="jira-connection" className="font-semibold"><Trans>Jira connection</Trans></h2>
        <p><Trans>Connected to <strong>{conn.site}</strong> as {conn.account} ({conn.email}).</Trans></p>
        <p className="text-muted-foreground"><Trans>The API token is kept, encrypted, until {until}, then deleted. Extend it if you need longer.</Trans></p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(async () => onChange(await jira.extend(token)))}><Trans>Keep it 30 more days</Trans></Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => {
            if (window.confirm(t`Delete the Jira connection? Its API token is forgotten.`)) void act(async () => { await jira.disconnect(token); onChange(null); });
          }}><Trans>Delete</Trans></Button>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="jira-connection" className="grid gap-3 rounded-lg border p-4 text-sm">
      <h2 id="jira-connection" className="font-semibold"><Trans>Connect Jira Cloud</Trans></h2>
      <p className="text-muted-foreground">
        <Trans>Use your Jira email and an API token. <a href={ATLASSIAN_TOKENS} target="_blank" rel="noreferrer" className="underline">Create a token at Atlassian</a>. TrackLin.es keeps it, encrypted, for 30 days.</Trans>
      </p>
      <label className="grid gap-1.5 font-medium"><Trans>Jira site</Trans>
        <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://your-team.atlassian.net" autoComplete="url" />
      </label>
      <label className="grid gap-1.5 font-medium"><Trans>Email</Trans>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="grid gap-1.5 font-medium"><Trans>API token</Trans>
        <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
      </label>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button className="w-fit" disabled={busy || !site.trim() || !email.trim() || !secret.trim()}
        onClick={() => void act(async () => { onChange(await jira.connect({ site, email, token: secret }, token)); setSecret(''); })}>
        <Trans>Connect</Trans>
      </Button>
    </section>
  );
}

// JiraPicker: which Jira projects to import, the preview (with prefixes and teams to choose), and the run.
function JiraPicker({ token }: { token: string }) {
  const { t } = useLingui();
  const { busy, error, act } = useAct();
  const [list, setList] = useState<JiraProject[] | null>(null);
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [prefixes, setPrefixes] = useState<Record<string, string>>({});
  const [teamOf, setTeamOf] = useState<Record<string, string>>({});
  const [job, setJob] = useState<ImportJob | null>(null);
  const [stale, setStale] = useState(false); // options changed since the preview
  useEffect(() => {
    void act(async () => setList(await jira.projects(token)));
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
      if (job?.state === 'previewing') void importsApi.cancel(job.id, token).catch(() => {}); // the old preview goes
      const keys = new Set(picked);
      setJob(await jira.preview({ projects: picked, prefixes: Object.fromEntries(Object.entries(prefixes).filter(([k, v]) => keys.has(k) && v)), teams: teamOf }, token));
      setStale(false);
    });
  }
  const change = <V,>(set: (f: (m: Record<string, V>) => Record<string, V>) => void) => (k: string, v: V) => { set((m) => ({ ...m, [k]: v })); setStale(true); };

  if (!list) return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <p role="status" className="text-sm text-muted-foreground"><Trans>Loading your Jira projects…</Trans></p>;
  const keyOf = Object.fromEntries(list.map((p) => [p.id, p.key]));
  const previewing = job?.state === 'previewing';
  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium"><Trans>Jira projects to import</Trans></legend>
        {list.length === 0 && <p className="text-sm text-muted-foreground"><Trans>This Jira token can’t see any projects.</Trans></p>}
        {list.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={picked.includes(p.key)} onCheckedChange={(on) => { setPicked((cur) => (on ? [...cur, p.key] : cur.filter((k) => k !== p.key))); setStale(true); }} />
            <span className="font-mono text-xs text-muted-foreground">{p.key}</span> {p.name}
          </label>
        ))}
      </fieldset>
      <Button className="w-fit" disabled={busy || picked.length === 0} onClick={preview}>{job ? <Trans>Preview again</Trans> : <Trans>Preview</Trans>}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {previewing && job && (
        <JiraPreview job={job} keyOf={keyOf} teams={teamList} taken={taken} prefixes={prefixes} teamOf={teamOf} stale={stale}
          setPrefix={change(setPrefixes)} setTeam={change(setTeamOf)} />
      )}
      {job && <ImportStatus job={job} busy={busy} summary={false} blocked={stale || (job.problems?.length ?? 0) > 0}
        onRun={() => void act(async () => setJob(await importsApi.run(job.id, token)))}
        {...importActions(job, token, act, setJob, t`Scrap this import? Everything it made is deleted.`)} />}
    </div>
  );
}

// JiraPreview: what the import makes (TL-543): each project with its prefix (and an input, checked as
// you type, when its own can't be used), each board's columns and team, plan limits, and who matched.
export function JiraPreview({ job, keyOf, teams, taken, prefixes, teamOf, stale, setPrefix, setTeam }: {
  job: ImportJob; keyOf: Record<string, string>; teams: Team[]; taken: string[]; prefixes: Record<string, string>; teamOf: Record<string, string>;
  stale: boolean; setPrefix: (key: string, v: string) => void; setTeam: (board: string, team: string) => void;
}) {
  const { t } = useLingui();
  const needs = prefixNeeded(job.problems);
  const limit = job.problems?.find((p) => p.code === 'project_limit');
  const boardProblem = Object.fromEntries((job.problems ?? []).filter((p) => p.code === 'board_columns').map((p) => [p.source_id, p.message]));
  const teamItems = { [NO_TEAM]: t`No team yet`, ...Object.fromEntries(teams.map((tm) => [tm.id, tm.name])) };
  const matched = (job.people ?? []).filter((p) => p.matched);
  const unmatched = (job.people ?? []).filter((p) => !p.matched);
  return (
    <section className="grid gap-5 text-sm" aria-label={t`What the import makes`} data-jira-preview>
      {job.planned && <p><Trans>This makes {job.planned.projects} projects, {job.planned.boards} boards and {job.planned.tickets} tickets, with {job.planned.comments} comments.</Trans></p>}
      {limit && (
        <div role="alert" className="grid gap-1 rounded-lg border border-destructive/50 p-3" data-limit>
          <p className="text-destructive">{limit.message}</p>
          <p><Trans><Link href="/settings" className="font-medium underline">Change your plan</Link>, or untick some projects and preview again.</Trans></p>
        </div>
      )}
      {(job.projects ?? []).map((p) => {
        const key = keyOf[p.source_id ?? ''] ?? p.prefix;
        const others = (job.projects ?? []).filter((o) => o !== p).map((o) => prefixes[keyOf[o.source_id ?? '']] || o.prefix);
        const typed = prefixes[key] ?? '';
        const why = typed ? prefixProblem(typed, [...taken, ...others]) : null;
        return (
          <div key={p.source_id} className="grid gap-3 rounded-lg border p-4" data-project={key}>
            <p className="flex flex-wrap items-center gap-2"><strong>{p.name}</strong> <Badge variant="outline" className="font-mono">{p.prefix}</Badge>
              <span className="text-muted-foreground"><Trans>{p.tickets} tickets</Trans></span>
              {p.prefix !== key && !prefixes[key] && !needs.has(p.source_id ?? '') && <span className="text-muted-foreground"><Trans>({key} is taken here, so a number was added)</Trans></span>}
            </p>
            {needs.has(p.source_id ?? '') && (
              <label className="grid gap-1.5 font-medium" data-prefix-input>
                <Trans>{key} can’t be used as a key prefix here. Choose one:</Trans>
                <Input value={typed} maxLength={6} className="w-40 font-mono" onChange={(e) => setPrefix(key, e.target.value.toUpperCase())} placeholder="ABC" aria-invalid={why !== null} />
                {why === 'format' && <span className="font-normal text-destructive"><Trans>2 to 6 capital letters or digits, starting with a letter.</Trans></span>}
                {why === 'taken' && <span className="font-normal text-destructive"><Trans>That prefix is already used.</Trans></span>}
                {typed && !why && <span className="font-normal text-muted-foreground"><Trans>Free to use: preview again to apply it.</Trans></span>}
              </label>
            )}
            {(p.boards ?? []).map((b) => (
              <div key={b.source_id} className="grid gap-2 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-start" data-board={b.source_id}>
                <div className="grid gap-1">
                  <p className="font-medium">{b.name}</p>
                  {boardProblem[b.source_id]
                    ? <p className="text-destructive" data-board-problem>{boardProblem[b.source_id]}</p>
                    : <p className="text-muted-foreground">{b.columns.join(' → ')}</p>}
                </div>
                <Select items={teamItems} value={teamOf[b.source_id] ?? b.team_id ?? NO_TEAM} onValueChange={(v) => setTeam(b.source_id, v && v !== NO_TEAM ? String(v) : '')}>
                  <SelectTrigger aria-label={t`Team for ${b.name}`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEAM}><Trans>No team yet</Trans></SelectItem>
                    {teams.map((tm) => <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        );
      })}
      {(matched.length > 0 || unmatched.length > 0) && (
        <div className="grid gap-1" data-people>
          <p className="font-medium"><Trans>People</Trans></p>
          {matched.length > 0 && <p><Trans>Matched to members by email:</Trans> {matched.map((p) => `${p.name} (${p.tickets})`).join(', ')}</p>}
          {unmatched.length > 0 && <p className="text-muted-foreground"><Trans>Not members here, so their tickets are left unassigned:</Trans> {unmatched.map((p) => `${p.name} (${p.tickets})`).join(', ')}</p>}
        </div>
      )}
      {stale && <p role="status" className="text-muted-foreground" data-stale><Trans>You’ve changed the import: preview again before importing.</Trans></p>}
    </section>
  );
}
