import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import type { PlannedSprint, Velocity } from '../api';
import { points } from '../board/estimates';

// Moving a backlog ticket to a board from its edit dialog (TL-464) follows refinement's rules: a sprint
// holds up to its capacity (velocity + 10%). The open sprint past it needs "Move anyway"; a planned
// sprint past it (and past what was approved) then needs approval before it starts.

export type MoveTarget = {
  id: string; // 'current', or the planned sprint's id
  label: string; // "Sprint 4 (current, 3 days left)", "Sprint 5 (planned)"
  unit: 'points' | 'tickets';
  used: number; // before this ticket
  after: number; // with it
  cap: number | null; // null: no closed sprints yet, so no limit
  over: boolean; // after > cap
  needsApproval: boolean; // planned only: over, and more than was approved
};

// ticketValue is what the ticket adds on a board counting unit: points by its estimate, or 1 ticket.
export const ticketValue = (unit: 'points' | 'tickets', estimate?: string | null) => (unit === 'tickets' ? 1 : points(estimate));

// daysLeft: whole days until the sprint ends (0 on its last day).
export const daysLeft = (endsAt: string, now = new Date()) => Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / 86_400_000));

// moveTargets: where the ticket can go on a sprint board, the open sprint first, with how full each gets.
export function moveTargets(v: Velocity, planned: PlannedSprint[], estimate: string | null | undefined, i18n: I18n, now = new Date()): MoveTarget[] {
  const out: MoveTarget[] = [];
  if (v.current) {
    const value = ticketValue(v.unit, estimate);
    const left = daysLeft(v.current.ends_at, now);
    const after = v.current.total + value;
    const number = v.current.number;
    out.push({
      id: 'current', label: left === 0 ? i18n._(msg`Sprint ${number} (current, last day)`) : i18n._(msg`Sprint ${number} (current, ${plural(left, { one: '# day left', other: '# days left' })})`),
      unit: v.unit, used: v.current.total, after, cap: v.cap ?? null, over: v.cap != null && after > v.cap, needsApproval: false,
    });
  }
  for (const p of planned) {
    const c = p.capacity;
    const after = c.used + ticketValue(c.unit, estimate);
    const over = c.cap !== null && after > c.cap;
    const number = p.number;
    out.push({
      id: p.id, label: i18n._(msg`Sprint ${number} (planned)`), unit: c.unit, used: c.used, after, cap: c.cap, over,
      needsApproval: over && (c.approved_total == null || after > c.approved_total),
    });
  }
  return out;
}

const fmt = (n: number) => Math.round(n * 10) / 10;

// fullness: "8 / 8.8 points", or "8 points, no limit yet".
export function fullness(t: Pick<MoveTarget, 'used' | 'cap' | 'unit'>, i18n: I18n): string {
  const used = fmt(t.used);
  if (t.cap === null) {
    return t.unit === 'points'
      ? i18n._(msg`${plural(used, { one: '# point', other: '# points' })}, no limit yet`)
      : i18n._(msg`${plural(used, { one: '# ticket', other: '# tickets' })}, no limit yet`);
  }
  const cap = fmt(t.cap);
  return t.unit === 'points' ? i18n._(msg`${used} / ${cap} points`) : i18n._(msg`${used} / ${cap} tickets`);
}

// overNote: what happens if it goes in anyway, or null when it fits.
export function overNote(t: MoveTarget, i18n: I18n): string | null {
  if (!t.over || t.cap === null) return null;
  const by = fmt(t.after - t.cap), after = fmt(t.after), cap = fmt(t.cap);
  const points = t.unit === 'points';
  if (t.id === 'current') {
    return points
      ? i18n._(msg`This takes the current sprint ${plural(by, { one: '# point', other: '# points' })} over capacity (${after} / ${cap}).`)
      : i18n._(msg`This takes the current sprint ${plural(by, { one: '# ticket', other: '# tickets' })} over capacity (${after} / ${cap}).`);
  }
  if (t.needsApproval) {
    return points
      ? i18n._(msg`This takes the sprint ${plural(by, { one: '# point', other: '# points' })} over capacity (${after} / ${cap}): it will need approval before it can start.`)
      : i18n._(msg`This takes the sprint ${plural(by, { one: '# ticket', other: '# tickets' })} over capacity (${after} / ${cap}): it will need approval before it can start.`);
  }
  return points
    ? i18n._(msg`This takes the sprint ${plural(by, { one: '# point', other: '# points' })} over capacity (${after} / ${cap}), within what was approved.`)
    : i18n._(msg`This takes the sprint ${plural(by, { one: '# ticket', other: '# tickets' })} over capacity (${after} / ${cap}), within what was approved.`);
}
