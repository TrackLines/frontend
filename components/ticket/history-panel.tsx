'use client';

import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { HistoryIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PRIORITY } from '@/components/board/priority-badge';
import { TICKET_TYPES } from '@/components/ticket-type';
import { When } from '@/components/when';
import { Button } from '@/components/ui/button';
import { ApiError, tickets, type ActivityEntry, type Assignee, type HistoryEntry, type TicketDetail } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { personLabel } from '@/lib/people';

// HistoryPanel: everything that happened to the ticket (TL-76, TL-680), on the full ticket page only: it's
// detail for looking back, not for working the board, so the board's dialog and side view leave it out.
// ticket names the tickets it links to (blockers, the parent), where the history only has their ids.
export function HistoryPanel({ ticketId, token, people, ticket }: { ticketId: string; token: string; people: Assignee[] | null; ticket?: TicketDetail }) {
  const [entries, setEntries] = useState<ActivityEntry[] | 'unavailable' | null>(null);
  useEffect(() => {
    // no panel rather than an error, except when the history is held elsewhere and can't be reached
    // (TL-667): then say so, so it doesn't look like there's none
    tickets.activity(ticketId, token).then(setEntries, (err) => setEntries(err instanceof ApiError && err.code === 'history_unavailable' ? 'unavailable' : null));
  }, [ticketId]); // token refreshes must not refetch
  // opened from the board's History button (/tickets/<id>#history): the panel loads after the page,
  // so the browser's own jump to #history found nothing; go there once it's here
  useEffect(() => {
    if (entries && window.location.hash === '#history') document.getElementById('history')?.scrollIntoView({ block: 'start' });
  }, [entries !== null]);
  return entries && <HistoryPanelView entries={entries} people={people} names={ticket ? namesOf(ticket) : {}} />;
}

export type HistoryStep = { at: string; who: string; text: string; skipped: string[] };

// namesOf: the titles of the tickets a ticket links to, by id, for history lines that name them.
export function namesOf(t: Pick<TicketDetail, 'parent' | 'children' | 'blocked_by' | 'blocks'>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of [...(t.parent ? [t.parent] : []), ...(t.children ?? []), ...t.blocked_by, ...t.blocks]) out[d.id] = d.title;
  return out;
}

const RESOLVED: Record<NonNullable<HistoryEntry['resolution']>, MessageDescriptor> = { done: msg`closed it as done`, wont_do: msg`closed it as won’t do`, duplicate: msg`closed it as a duplicate` };

// ACTIONS is every action the backend records on a ticket (its OpenAPI, /tickets/{id}/activity): each has a
// sentence below, and a test fails on one without.
export const ACTIONS = [
  'ticket.stage', 'ticket.assigned', 'ticket.updated', 'ticket.labels_changed', 'ticket.blocked_by_changed', 'ticket.parent_changed',
  'ticket.sprint_changed', 'ticket.planned_changed', 'ticket.reopened', 'ticket.duplicate_of', 'ticket.deleted', 'ticket.restored',
  'ticket.review_requested', 'ticket.review_ended', 'comment.added', 'comment.edited', 'comment.deleted',
  'attachment.added', 'attachment.removed', 'attachment.kept', 'pr.linked', 'pr.state_changed', 'pr.unlinked',
] as const;

type Data = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const list = (v: unknown) => (Array.isArray(v) ? v.map(str) : []);

// fieldChange: "the priority from Medium to Urgent", one changed field of a ticket.updated, in words.
function fieldChange(i18n: I18n, field: string, change: unknown): string {
  const { from, to } = (change ?? {}) as { from?: unknown; to?: unknown };
  const priority = (v: unknown) => (PRIORITY[str(v)] ? i18n._(PRIORITY[str(v)].label) : str(v));
  const type = (v: unknown) => { const t = TICKET_TYPES.find((x) => x.value === v); return t ? i18n._(t.label) : str(v); };
  const day = (v: unknown) => (v ? dates(i18n, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${str(v).slice(0, 10)}T00:00:00Z`)) : '');
  switch (field) {
    case 'title': return i18n._(msg`edited the title`);
    case 'description': return i18n._(msg`edited the description`);
    case 'type': { const a = type(from), b = type(to); return i18n._(msg`changed the type from ${a} to ${b}`); }
    case 'priority': { const a = priority(from), b = priority(to); return i18n._(msg`changed the priority from ${a} to ${b}`); }
    case 'estimate': {
      const a = str(from), b = str(to);
      return !from ? i18n._(msg`estimated it at ${b}`) : !to ? i18n._(msg`removed the estimate`) : i18n._(msg`changed the estimate from ${a} to ${b}`);
    }
    case 'due_date': { const b = day(to); return to ? i18n._(msg`set the due date to ${b}`) : i18n._(msg`removed the due date`); }
    case 'timebox_days':
    case 'timebox_hours': return i18n._(msg`changed the timebox`);
  }
  return i18n._(msg`changed the ${field}`);
}

// activitySteps turns a ticket's activity into what happened, newest first, one line each. Skipped stages
// fold into the move that skipped them ("moved it to Done", skipped In progress), the first stage says where
// it was made, and text changes say only that they happened (the history never holds the text).
export function activitySteps(i18n: I18n, entries: ActivityEntry[], people: Assignee[] | null, names: Record<string, string> = {}): HistoryStep[] {
  const backlog = i18n._(msg`the backlog`);
  const name = (id: unknown) => (id ? personLabel(i18n, str(id), people) : '');
  const ticketName = (id: unknown) => names[str(id)] ?? i18n._(msg`another ticket`);
  const steps: HistoryStep[] = [];
  let skipped: string[] = [];
  let first = true;
  for (const e of entries) {
    const d = (e.data ?? {}) as Data;
    const who = e.actor ? personLabel(i18n, e.actor, people) : 'TrackLin.es';
    const add = (text: string, skip: string[] = []) => steps.push({ at: e.at, who, text, skipped: skip });
    switch (e.action) {
      case 'ticket.stage': {
        if (d.outcome === 'skipped') {
          skipped.push(d.stage === 'backlog' ? backlog : str(d.column_name) || i18n._(msg`a column`));
          continue;
        }
        const column = str(d.column_name);
        const board = str(d.board_name);
        const where = d.stage === 'backlog' ? backlog : board ? i18n._(msg`${column} on ${board}`) : column;
        const text = d.stage === 'resolved'
          ? i18n._(RESOLVED[(str(d.resolution) || 'done') as keyof typeof RESOLVED] ?? RESOLVED.done)
          : first ? i18n._(msg`created it in ${where}`) : d.stage === 'backlog' ? i18n._(msg`sent it to the backlog`) : i18n._(msg`moved it to ${where}`);
        // made straight on a board: skipping the backlog is how every board ticket starts, not news
        add(text, first ? skipped.filter((s) => s !== backlog) : skipped);
        skipped = [];
        first = false;
        continue;
      }
      case 'ticket.assigned': {
        const from = name(d.from), to = name(d.to);
        if (!d.to) add(d.from === e.actor ? i18n._(msg`unassigned themself`) : i18n._(msg`unassigned ${from}`));
        else if (d.to === e.actor) add(i18n._(msg`assigned it to themself`));
        else if (d.from) add(i18n._(msg`reassigned it from ${from} to ${to}`));
        else add(i18n._(msg`assigned it to ${to}`));
        continue;
      }
      case 'ticket.updated': {
        const fields = (d.fields ?? {}) as Data;
        // one timebox line however many of its parts changed
        const parts = [...new Set(Object.keys(fields).map((f) => fieldChange(i18n, f, fields[f])))];
        add(parts.join(', '));
        continue;
      }
      case 'ticket.labels_changed': {
        const added = list(d.added).join(', '), removed = list(d.removed).join(', ');
        add(added ? i18n._(msg`added the labels ${added}`) : i18n._(msg`removed the labels ${removed}`));
        continue;
      }
      case 'ticket.blocked_by_changed': {
        const added = list(d.added).map(ticketName).join(', '), removed = list(d.removed).map(ticketName).join(', ');
        add(added ? i18n._(msg`marked it blocked by ${added}`) : i18n._(msg`removed the blocker ${removed}`));
        continue;
      }
      case 'ticket.parent_changed': {
        const to = ticketName(d.to);
        add(d.to ? i18n._(msg`made it part of ${to}`) : i18n._(msg`detached it from its parent`));
        continue;
      }
      case 'ticket.sprint_changed':
        add(!d.to ? i18n._(msg`took it out of its sprint`) : d.from ? i18n._(msg`moved it to another sprint`) : i18n._(msg`added it to a sprint`));
        continue;
      case 'ticket.planned_changed':
        add(d.to ? i18n._(msg`planned it for a later sprint`) : i18n._(msg`took it out of a planned sprint`));
        continue;
      case 'ticket.reopened': add(i18n._(msg`reopened it`)); continue;
      case 'ticket.duplicate_of': { const of = ticketName(d.of); add(i18n._(msg`marked it a duplicate of ${of}`)); continue; }
      case 'ticket.deleted': add(i18n._(msg`deleted it`)); continue;
      case 'ticket.restored': add(i18n._(msg`restored it`)); continue;
      case 'ticket.review_requested': add(i18n._(msg`asked for a review`)); continue;
      case 'ticket.review_ended': add(i18n._(msg`finished the review`)); continue;
      case 'comment.added': add(d.reply_to ? i18n._(msg`replied to a comment`) : i18n._(msg`commented`)); continue;
      case 'comment.edited': add(i18n._(msg`edited a comment`)); continue;
      case 'comment.deleted': add(i18n._(msg`deleted a comment`)); continue;
      case 'attachment.added': { const f = str(d.name); add(i18n._(msg`attached ${f}`)); continue; }
      case 'attachment.removed': { const f = str(d.name); add(i18n._(msg`removed ${f}`)); continue; }
      case 'attachment.kept': { const f = str(d.name); add(i18n._(msg`kept ${f} for another year`)); continue; }
      case 'pr.linked': { const pr = `${str(d.repo)}#${str(d.number)}`; add(i18n._(msg`linked pull request ${pr}`)); continue; }
      case 'pr.unlinked': { const pr = `${str(d.repo)}#${str(d.number)}`; add(i18n._(msg`unlinked pull request ${pr}`)); continue; }
      case 'pr.state_changed': {
        const pr = `${str(d.repo)}#${str(d.number)}`;
        add(d.to === 'merged' ? i18n._(msg`merged pull request ${pr}`) : d.to === 'closed' ? i18n._(msg`closed pull request ${pr}`) : i18n._(msg`reopened pull request ${pr}`));
        continue;
      }
    }
    add(i18n._(msg`made a change`)); // an action this version doesn't know yet
  }
  return steps.reverse();
}

// historySteps: the stages alone (the older /history shape), through the same sentences.
export function historySteps(i18n: I18n, entries: HistoryEntry[], people: Assignee[] | null): HistoryStep[] {
  return activitySteps(i18n, entries.map(({ at, actor, ...data }, i) => ({ id: String(i), at, actor: actor ?? null, actor_kind: actor ? 'person' : 'system', action: 'ticket.stage', data })), people);
}

// SHOWN: how many lines a long history shows before "Show older".
export const SHOWN = 50;

// HistoryPanelView: the list (pure, for tests).
export function HistoryPanelView({ entries, people, names = {} }: { entries: ActivityEntry[] | 'unavailable'; people: Assignee[] | null; names?: Record<string, string> }) {
  const { i18n } = useLingui();
  const [all, setAll] = useState(false);
  const steps = entries === 'unavailable' ? [] : activitySteps(i18n, entries, people, names);
  const shown = all ? steps : steps.slice(0, SHOWN);
  return (
    <section id="history" aria-label={i18n._(msg`History`)} className="grid scroll-mt-4 gap-2 rounded-lg border p-3 text-sm">
      <h2 className="flex items-center gap-1.5 font-semibold"><HistoryIcon className="size-4" aria-hidden /> <Trans>History</Trans></h2>
      {entries === 'unavailable' ? (
        <p role="status" className="text-muted-foreground"><Trans>History can’t be loaded right now. Try again shortly.</Trans></p>
      ) : steps.length === 0 ? (
        <p className="text-muted-foreground"><Trans>Nothing recorded yet. History is kept from October 2026.</Trans></p>
      ) : (
        <ol className="grid gap-1.5">
          {shown.map((s, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-medium">{s.who}</span>
              <span>{s.text}</span>
              {s.skipped.length > 0 && <span className="text-muted-foreground"><Trans>(skipped {s.skipped.join(', ')})</Trans></span>}
              <When iso={s.at} className="text-xs text-muted-foreground" />
            </li>
          ))}
        </ol>
      )}
      {!all && steps.length > SHOWN && (
        <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setAll(true)}><Trans>Show older</Trans></Button>
      )}
    </section>
  );
}
