'use client';

import { CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, backlog, boards, projects, tickets, type Dep, type Project, type TicketDetail } from '@/lib/api';

export type TicketOption = { id: string; title: string; done: boolean };
type Option = TicketOption;

// projectTickets gathers every ticket in a project (each board's current view + the backlog), with
// done = in its board's last column. Used by the "blocked by" and roadmap-item pickers.
// ponytail: client-side gather; add a project tickets endpoint if projects get big.
export async function projectTickets(projectId: string, token: string): Promise<TicketOption[]> {
  const p = await projects.get(projectId, token);
  const [bl, ...bs] = await Promise.all([backlog.list(projectId, token), ...(p.boards ?? []).map((b) => boards.get(b.id, token))]);
  const onBoards = bs.flatMap((b) => (b.columns ?? []).flatMap((c, i, cols) => c.tickets.map((t) => ({ id: t.id, title: t.title, done: i === cols.length - 1 }))));
  return [...onBoards, ...bl.map((t) => ({ id: t.id, title: t.title, done: false }))];
}

// DepRow: one linked ticket. here: the project it's seen from; a ticket in another project reads "Project - Title" (TL-715).
export function DepRow({ d, here, onRemove, removeLabel }: { d: Dep; here?: string; onRemove?: () => void; removeLabel?: string }) {
  const { t } = useLingui();
  const title = d.title;
  const elsewhere = d.project_name && d.project_id !== here ? d.project_name : '';
  return (
    <li className="flex items-center gap-2 text-sm">
      {d.done ? <CheckIcon className="size-4 text-emerald-600" aria-label={t`done`} /> : <span className="size-4 rounded-full border" aria-label={t`not done`} />}
      <Link href={`/tickets/${d.id}`} className={`min-w-0 flex-1 truncate hover:underline ${d.done ? 'text-muted-foreground line-through' : ''}`}>
        {elsewhere && <span className="text-muted-foreground">{elsewhere} - </span>}{d.title}
      </Link>
      {onRemove && (
        <Button type="button" variant="ghost" size="icon-xs" onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label={removeLabel ?? t`Stop waiting on ${title}`}>
          <XIcon />
        </Button>
      )}
    </li>
  );
}

// BlockedBy: what this ticket waits on, editable (the Ticket links tab names it, TL-686).
export function BlockedBy({ ticket, token, onChanged }: { ticket: TicketDetail; token: string; onChanged: () => void }) {
  const { t } = useLingui();
  const [options, setOptions] = useState<Option[] | null>(null);
  const [orgProjects, setOrgProjects] = useState<Project[]>([]);
  const [from, setFrom] = useState(ticket.project_id); // blockers can be in any of the org's projects (TL-715)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = ticket.blocked_by.map((d) => d.id);

  async function save(ids: string[]) {
    setSaving(true);
    setError('');
    try {
      await tickets.setBlockedBy(ticket.id, ids, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 400 || err.status === 409) ? err.message : t`Couldn’t update dependencies. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  const choices = (options ?? []).filter((o) => o.id !== ticket.id && !current.includes(o.id));
  const load = (project: string) => {
    setFrom(project);
    setOptions(null);
    projectTickets(project, token).then(setOptions, () => setError(t`Couldn’t load the project’s tickets.`));
  };
  const start = () => {
    projects.list(token).then(setOrgProjects, () => {}); // ponytail: just this project if the list can't load
    load(ticket.project_id);
  };

  return (
    <div className="grid gap-1.5">
      {ticket.blocked_by.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ticket.done ? <Trans>Nothing.</Trans> : <Trans>Nothing — it can be picked up.</Trans>}</p>
      ) : (
        <ul className="grid gap-1">{ticket.blocked_by.map((d) => <DepRow key={d.id} d={d} here={ticket.project_id} onRemove={saving ? undefined : () => save(current.filter((x) => x !== d.id))} />)}</ul>
      )}
      {/* a done ticket can drop blockers but not gain them (TL-528) */}
      {!ticket.done && <div className="flex flex-wrap items-center gap-2">
        {orgProjects.length > 1 && (
          <Select items={Object.fromEntries(orgProjects.map((p) => [p.id, p.name]))} value={from} onValueChange={(v) => v && load(String(v))} disabled={saving}>
            <SelectTrigger size="sm" className="w-48" aria-label={t`Project the blocker is in`}><SelectValue /></SelectTrigger>
            <SelectContent>{orgProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {options === null && orgProjects.length === 0 ? (
          <Button size="sm" variant="outline" disabled={saving} onClick={start}>
            <Trans>Add a blocker…</Trans>
          </Button>
        ) : options === null ? null : (
          <Select items={Object.fromEntries(choices.map((o) => [o.id, o.title]))} value={null} onValueChange={(v) => v && save([...current, String(v)])} disabled={saving}>
            <SelectTrigger size="sm" className="w-full max-w-md" aria-label={t`Choose a ticket this one waits on`}>
              <SelectValue placeholder={choices.length ? t`Choose a ticket it waits on…` : t`No other tickets in this project`} />
            </SelectTrigger>
            <SelectContent>{choices.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Blocks: what waits on this ticket (set from those tickets' own Blocked by).
export function Blocks({ ticket }: { ticket: TicketDetail }) {
  if (ticket.blocks.length === 0) return <p className="text-sm text-muted-foreground"><Trans>Nothing waits on it.</Trans></p>;
  return <ul className="grid gap-1">{ticket.blocks.map((d) => <DepRow key={d.id} d={d} here={ticket.project_id} />)}</ul>;
}
