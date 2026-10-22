import type { ReportTotals } from './api';

// Sprint reports (TL-400): the pure parts, kept apart for tests.

export type Scope = { kind: 'board'; id: string } | { kind: 'project'; id: string } | { kind: 'org' };
export type Range = { from: string; to: string }; // YYYY-MM-DD, to inclusive

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PRESETS = [
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'last-90', label: 'Last 90 days' },
  { id: 'this-quarter', label: 'This quarter' },
  { id: 'last-quarter', label: 'Last quarter' },
] as const;
export type Preset = (typeof PRESETS)[number]['id'];

// presetRange: a preset's days, in the viewer's own calendar.
export function presetRange(preset: Preset, now = new Date()): Range {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const q = Math.floor(today.getMonth() / 3) * 3; // this quarter's first month
  switch (preset) {
    case 'last-30': return { from: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to: ymd(today) };
    case 'last-90': return { from: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89)), to: ymd(today) };
    case 'this-quarter': return { from: ymd(new Date(today.getFullYear(), q, 1)), to: ymd(today) };
    case 'last-quarter': return { from: ymd(new Date(today.getFullYear(), q - 3, 1)), to: ymd(new Date(today.getFullYear(), q, 0)) };
  }
}

// presetOf: which preset a range is, if any (so the picker shows it).
export function presetOf(range: Range, now = new Date()): Preset | null {
  return PRESETS.find((p) => { const r = presetRange(p.id, now); return r.from === range.from && r.to === range.to; })?.id ?? null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// readQuery: the report the address asks for: ?board=<id> | ?project=<id> | ?org=1, and from/to
// (default: the last 90 days). The address is the report, so it can be shared.
export function readQuery(q: URLSearchParams, now = new Date()): { scope: Scope | null; range: Range } {
  const scope: Scope | null = q.get('board') ? { kind: 'board', id: q.get('board')! }
    : q.get('project') ? { kind: 'project', id: q.get('project')! }
    : q.get('org') === '1' ? { kind: 'org' } : null;
  const from = q.get('from') ?? '', to = q.get('to') ?? '';
  const range = DAY.test(from) && DAY.test(to) && from <= to ? { from, to } : presetRange('last-90', now);
  return { scope, range };
}

export function writeQuery(scope: Scope, range: Range): string {
  const q = new URLSearchParams(scope.kind === 'org' ? { org: '1' } : { [scope.kind]: scope.id });
  q.set('from', range.from);
  q.set('to', range.to);
  return `/reports?${q}`;
}

export const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
export const pct = (p: number | null | undefined) => (p == null ? '–' : `${Math.round(p * 100)}%`);

// trend: how a figure moved against the period before ("up", "down", "same"), or null with nothing to compare.
export function trend(now: number | null | undefined, before: number | null | undefined): 'up' | 'down' | 'same' | null {
  if (now == null || before == null) return null;
  const a = Math.round(now * 100), b = Math.round(before * 100);
  return a > b ? 'up' : a < b ? 'down' : 'same';
}

// scopeChange: work added after the start, as a share of what was planned.
export const scopeChange = (t: ReportTotals) => (t.added == null || t.planned === 0 ? null : t.added / t.planned);

export const TYPE_LABEL: Record<string, string> = { bug: 'Bugs', feature: 'Features', task: 'Tasks', spike: 'Spikes', epic: 'Epics' };
