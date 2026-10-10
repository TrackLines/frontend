import type { Capacity } from './api';

export const MAX_PLANNED = 2; // planned sprints per board, after the current one (backend sprints.MaxPlanned)

export type CapacityView = {
  label: string; // e.g. "8 / 8.8 points", or "8 points · no velocity yet"
  percent: number | null; // how full, for the bar (capped at 100); null without a cap
  state: 'unknown' | 'ok' | 'over' | 'approved';
  note: string | null; // what to do or know, e.g. "2 over: needs approval to start"
};

const fmt = (n: number) => String(Math.round(n * 10) / 10);

// capacityView turns a planned sprint's capacity into what the refinement view shows.
export function capacityView(c: Capacity): CapacityView {
  const unit = c.unit === 'points' ? 'points' : 'tickets';
  const unestimated = c.unestimated > 0 ? ` · ${c.unestimated} unestimated` : '';
  if (c.cap === null) {
    return { label: `${fmt(c.used)} ${unit} · no velocity yet${unestimated}`, percent: null, state: 'unknown', note: 'No closed sprints yet, so there’s no limit.' };
  }
  const label = `${fmt(c.used)} / ${fmt(c.cap)} ${unit}${unestimated}`;
  const percent = c.cap > 0 ? Math.min(100, Math.round((c.used / c.cap) * 100)) : 100;
  if (!c.over) return { label, percent, state: 'ok', note: null };
  const over = `${fmt(c.used - c.cap)} over`;
  if (!c.needs_approval) return { label, percent, state: 'approved', note: `${over}: approved` };
  return { label, percent, state: 'over', note: `${over}: needs approval to start, or move tickets out` };
}
