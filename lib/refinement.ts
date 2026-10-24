import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import type { Capacity } from './api';

export const MAX_PLANNED = 2; // planned sprints per board, after the current one (backend sprints.MaxPlanned)

export type CapacityView = {
  label: string; // e.g. "8 / 8.8 points", or "8 points · no velocity yet"
  percent: number | null; // how full, for the bar (capped at 100); null without a cap
  state: 'unknown' | 'ok' | 'over' | 'approved';
  note: string | null; // what to do or know, e.g. "2 over: needs approval to start"
  availability: string | null; // "85% available · 6 person-days away" (a team figure, TL-408); null without Google Calendar
};

const fmt = (n: number) => Math.round(n * 10) / 10;

// capacityView turns a planned sprint's capacity into what the refinement view shows.
export function capacityView(c: Capacity, i18n: I18n): CapacityView {
  return { ...capacityState(c, i18n), availability: availabilityLabel(c, i18n) };
}

function availabilityLabel({ availability: a }: Capacity, i18n: I18n): string | null {
  if (!a) return null;
  const percent = fmt(a.percent);
  return i18n._(msg`${percent}% available · ${plural(fmt(a.person_days_away), { one: '# person-day away', other: '# person-days away' })}`);
}

function capacityState(c: Capacity, i18n: I18n): Omit<CapacityView, 'availability'> {
  const points = c.unit === 'points';
  const used = fmt(c.used);
  const count = c.unestimated;
  const unestimated = count > 0 ? ` · ${i18n._(msg`${count} unestimated`)}` : '';
  if (c.cap === null) {
    const label = points
      ? i18n._(msg`${plural(used, { one: '# point', other: '# points' })} · no velocity yet`)
      : i18n._(msg`${plural(used, { one: '# ticket', other: '# tickets' })} · no velocity yet`);
    return { label: label + unestimated, percent: null, state: 'unknown', note: i18n._(msg`No closed sprints yet, so there’s no limit.`) };
  }
  const cap = fmt(c.cap);
  const label = (points ? i18n._(msg`${used} / ${cap} points`) : i18n._(msg`${used} / ${cap} tickets`)) + unestimated;
  const percent = c.cap > 0 ? Math.min(100, Math.round((c.used / c.cap) * 100)) : 100;
  if (!c.over) return { label, percent, state: 'ok', note: null };
  const over = fmt(c.used - c.cap);
  if (!c.needs_approval) return { label, percent, state: 'approved', note: i18n._(msg`${over} over: approved`) };
  return { label, percent, state: 'over', note: i18n._(msg`${over} over: needs approval to start, or move tickets out`) };
}
