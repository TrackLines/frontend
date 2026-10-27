'use client';

import Link from 'next/link';
import { useLingui } from '@lingui/react';
import { Trans, useLingui as useT } from '@lingui/react/macro';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DownloadIcon, ScrollTextIcon } from 'lucide-react';
import { UpgradeDialog } from '@/components/billing/upgrade-dialog';
import { When } from '@/components/common/when';
import { SettingsCard } from '@/components/settings/settings-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, auditLog, projects as projectsApi, type Assignee, type AuditEvent, type AuditPage, type Project, type Subscription } from '@/lib/api';
import { ACTION_FILTERS, auditLink, auditSentence, filtersOf, URL_FILTERS, whoDid } from '@/lib/org/audit';
import { personLabel } from '@/lib/work/people';

// AuditLogCard: the audit log's Settings card (TL-671). Pro and Enterprise open the log; Free sees what it
// is and how to get it, with no page.
export function AuditLogCard({ plan, token }: { plan: Subscription | null; token: string | null }) {
  const { t } = useT();
  const [upgrade, setUpgrade] = useState(false);
  if (plan?.paid) return <SettingsCard icon={ScrollTextIcon} title={t`Audit log`} href="/settings/audit" description={t`Who did what across your organization: members, keys, projects, integrations and more.`} />;
  return (
    <SettingsCard icon={ScrollTextIcon} title={t`Audit log`} description={t`See who did what across your organization. Comes with the Pro and Enterprise plans.`}>
      <span data-audit-upsell />
      {token && <Button variant="outline" size="sm" onClick={() => setUpgrade(true)}><Trans>Upgrade</Trans></Button>}
      {token && <UpgradeDialog open={upgrade} onOpenChange={setUpgrade} token={token} plan={plan ?? undefined} />}
    </SettingsCard>
  );
}

// AuditLogView: a page of the log as a table: when (local), who, what happened, and the target where it can be opened.
export function AuditLogView({ events, people, projects }: { events: AuditEvent[]; people: Assignee[] | null; projects: Project[] }) {
  const { i18n } = useLingui();
  const ids = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  if (events.length === 0) return <p className="text-sm text-muted-foreground"><Trans>Nothing in the log for these filters.</Trans></p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Trans>When</Trans></TableHead>
          <TableHead><Trans>Who</Trans></TableHead>
          <TableHead><Trans>What</Trans></TableHead>
          <TableHead className="sr-only"><Trans>Open</Trans></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => {
          const href = auditLink(e, ids);
          return (
            <TableRow key={e.id} data-action={e.action}>
              <TableCell className="whitespace-nowrap text-muted-foreground"><When iso={e.at} /></TableCell>
              <TableCell>{whoDid(i18n, e, people)}</TableCell>
              <TableCell className="whitespace-normal">{auditSentence(i18n, e, people)}</TableCell>
              <TableCell className="text-right">{href && <Link href={href} className="text-sm font-medium text-primary hover:underline"><Trans>Open</Trans></Link>}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

const ANYONE = '_';

// AuditLog: the org's log (TL-671), newest first, filtered by person, kind of change, project and dates, all
// kept in the URL; "Load more" for older entries; the same filters exported as CSV.
export function AuditLog({ token, people, enterprise }: { token: string; people: Assignee[] | null; enterprise: boolean }) {
  const { t, i18n } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const [page, setPage] = useState<AuditPage | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { projectsApi.list(token).then(setProjects, () => {}); }, [token]);
  const problem = (e: unknown) => (e instanceof ApiError && e.status < 500 ? e.message : t`Couldn’t load the audit log. Please try again.`);
  useEffect(() => {
    setPage(null);
    setError('');
    auditLog.list(filtersOf(new URLSearchParams(query)), token).then(setPage, (e) => setError(problem(e)));
  }, [query, token]);

  function set(name: (typeof URL_FILTERS)[number], value: string) {
    const next = new URLSearchParams(query);
    if (value && value !== ANYONE) next.set(name, value);
    else next.delete(name);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }
  async function more() {
    if (!page?.next_cursor) return;
    setBusy(true);
    try {
      const older = await auditLog.list({ ...filtersOf(new URLSearchParams(query)), cursor: page.next_cursor }, token);
      setPage({ events: [...page.events, ...older.events], next_cursor: older.next_cursor });
    } catch (e) {
      setError(problem(e));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    try {
      const url = URL.createObjectURL(new Blob([await auditLog.exportCSV(filtersOf(new URLSearchParams(query)), token)], { type: 'text/csv' }));
      Object.assign(document.createElement('a'), { href: url, download: 'audit-log.csv' }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(problem(e));
    } finally {
      setBusy(false);
    }
  }

  const value = (name: string) => params.get(name) || ANYONE;
  const who = (people ?? []).map((p) => ({ id: p.id, name: personLabel(i18n, p.id, people) })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground" data-audit-retention>
        {enterprise ? <Trans>Kept while your organization exists on Enterprise.</Trans> : <Trans>Kept for a year on Pro.</Trans>}
      </p>
      <div className="flex flex-wrap items-end gap-2" role="group" aria-label={t`Filters`}>
        <Select items={{ [ANYONE]: t`Anyone`, ...Object.fromEntries(who.map((p) => [p.id, p.name])) }} value={value('actor')} onValueChange={(v) => set('actor', String(v ?? ''))}>
          <SelectTrigger size="sm" className="w-44" aria-label={t`Who`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANYONE}><Trans>Anyone</Trans></SelectItem>
            {who.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ [ANYONE]: t`Every change`, ...Object.fromEntries(ACTION_FILTERS.map((a) => [a.value, i18n._(a.label)])) }} value={value('action')} onValueChange={(v) => set('action', String(v ?? ''))}>
          <SelectTrigger size="sm" className="w-52" aria-label={t`What`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANYONE}><Trans>Every change</Trans></SelectItem>
            {ACTION_FILTERS.map((a) => <SelectItem key={a.value} value={a.value}>{i18n._(a.label)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ [ANYONE]: t`Every project`, ...Object.fromEntries(projects.map((p) => [p.id, p.name])) }} value={value('project')} onValueChange={(v) => set('project', String(v ?? ''))}>
          <SelectTrigger size="sm" className="w-44" aria-label={t`Project`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANYONE}><Trans>Every project</Trans></SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="grid gap-1 text-xs text-muted-foreground"><Trans>From</Trans>
          <Input type="date" className="h-8 w-40" value={params.get('from') ?? ''} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground"><Trans>To</Trans>
          <Input type="date" className="h-8 w-40" value={params.get('to') ?? ''} onChange={(e) => set('to', e.target.value)} />
        </label>
        <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={() => void download()}>
          <DownloadIcon aria-hidden /><Trans>Export CSV</Trans>
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {page ? <AuditLogView events={page.events} people={people} projects={projects} /> : !error && <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>}
      {page?.next_cursor && <Button variant="outline" size="sm" className="w-fit" disabled={busy} onClick={() => void more()}><Trans>Load more</Trans></Button>}
    </div>
  );
}
