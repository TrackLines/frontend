import type { PlannedSprint, Velocity } from './api';
import { points } from './estimates';

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
export function moveTargets(v: Velocity, planned: PlannedSprint[], estimate: string | null | undefined, now = new Date()): MoveTarget[] {
  const out: MoveTarget[] = [];
  if (v.current) {
    const value = ticketValue(v.unit, estimate);
    const left = daysLeft(v.current.ends_at, now);
    const after = v.current.total + value;
    out.push({
      id: 'current', label: `Sprint ${v.current.number} (current, ${left === 0 ? 'last day' : `${left} day${left === 1 ? '' : 's'} left`})`,
      unit: v.unit, used: v.current.total, after, cap: v.cap ?? null, over: v.cap != null && after > v.cap, needsApproval: false,
    });
  }
  for (const p of planned) {
    const c = p.capacity;
    const after = c.used + ticketValue(c.unit, estimate);
    const over = c.cap !== null && after > c.cap;
    out.push({
      id: p.id, label: `Sprint ${p.number} (planned)`, unit: c.unit, used: c.used, after, cap: c.cap, over,
      needsApproval: over && (c.approved_total == null || after > c.approved_total),
    });
  }
  return out;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

// fullness: "8 / 8.8 points", or "8 points, no limit yet".
export const fullness = (t: Pick<MoveTarget, 'used' | 'cap' | 'unit'>) => (t.cap === null ? `${fmt(t.used)} ${t.unit}, no limit yet` : `${fmt(t.used)} / ${fmt(t.cap)} ${t.unit}`);

// overNote: what happens if it goes in anyway, or null when it fits.
export function overNote(t: MoveTarget): string | null {
  if (!t.over || t.cap === null) return null;
  const by = `${fmt(t.after - t.cap)} ${t.unit} over capacity (${fmt(t.after)} / ${fmt(t.cap)})`;
  if (t.id === 'current') return `This takes the current sprint ${by}.`;
  return t.needsApproval ? `This takes the sprint ${by}: it will need approval before it can start.` : `This takes the sprint ${by}, within what was approved.`;
}
