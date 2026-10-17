import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportView } from './report-view';
import { ReportLink } from '@/components/board/past-sprints';
import type { BoardReport } from '@/lib/api';
import { presetOf, presetRange, readQuery, scopeChange, trend, writeQuery } from '@/lib/sprint-report';

const report: BoardReport = {
  board_id: 'b1', board_name: 'Backend', unit: 'points', from: '2026-07-01T00:00:00Z', to: '2026-10-01T00:00:00Z',
  summary: 'Delivered 67% of planned work across 1 sprint, up from 25%.',
  sprints: [
    { number: 1, starts_at: '2026-08-01T00:00:00Z', ends_at: '2026-08-15T00:00:00Z', closed_at: '2026-08-15T00:00:00Z', goal: 'Old goal', goal_met: false, planned: 4, estimated: true, done: 1, predictability: 0.25, added: null, removed: null, carried: 3, velocity: 1, approved_over: null, mix: [{ type: 'bug', count: 1, value: 1 }] },
    { number: 2, starts_at: '2026-08-15T00:00:00Z', ends_at: '2026-08-29T00:00:00Z', closed_at: '2026-08-29T00:00:00Z', goal: 'Ship search', goal_met: true, planned: 3, done: 2, predictability: 0.667, added: 1, removed: 1, carried: 0, velocity: 1.5, approved_over: null, mix: [{ type: 'bug', count: 1, value: 1 }, { type: 'feature', count: 1, value: 1 }] },
    { number: 3, starts_at: '2026-08-29T00:00:00Z', ends_at: '2026-09-12T00:00:00Z', closed_at: null, goal: 'Billing', goal_met: null, planned: 5, done: 1, predictability: 0.2, added: 0, removed: 0, carried: null, velocity: null, approved_over: null, mix: [] },
  ],
  totals: { sprints: 2, planned: 7, done: 3, predictability: 0.43, added: 1, carried: 3, velocity: 1.5, mix: [] },
  previous: { sprints: 1, planned: 4, done: 1, predictability: 0.25, added: null, carried: 3, velocity: 1, mix: [] },
};

test('a board report: the summary, headline cards with trends, every chart, goals and the table (TL-400)', () => {
  const html = renderToStaticMarkup(<ReportView report={report} />);
  expect(html).toContain('Delivered 67% of planned work across 1 sprint, up from 25%.');
  for (const s of ['Delivered', '3 of 7', 'Predictability', '43%', 'Velocity', 'Scope change', '14%', 'Carried over']) expect(html).toContain(s);
  expect(html).toContain('aria-label="up on the period before"'); // predictability and velocity both rose
  for (const chart of ['Planned vs delivered', 'Velocity', 'Predictability', 'Scope change', 'Work mix']) expect(html).toContain(`aria-label="${chart}"`);
  expect(html).toContain('The band, 80–100%, is on target'); // every chart says what it shows
  // goals: met, not met, in progress
  expect(html).toContain('aria-label="Met"');
  expect(html).toContain('aria-label="Not met"');
  expect(html).toContain('(in progress)');
  // the table, with the open sprint marked and the old sprint flagged as estimated
  expect(html).toContain('Sprint 3 (so far)');
  expect(html).toContain('From before reports were recorded');
  // never about people
  for (const banned of ['assign', 'Assignee', 'user_']) expect(html).not.toContain(banned);
});

test('no sprints in the period: says so instead of empty charts', () => {
  const html = renderToStaticMarkup(<ReportView report={{ ...report, sprints: [], summary: 'No sprints finished in this period.' }} />);
  expect(html).toContain('No sprints in this period');
  expect(html).not.toContain('aria-label="Velocity"');
});

test('the address is the report: scope and range round-trip; presets in the viewer’s calendar', () => {
  const now = new Date(2026, 9, 17); // 17 Oct 2026
  expect(presetRange('last-30', now)).toEqual({ from: '2026-09-18', to: '2026-10-17' });
  expect(presetRange('this-quarter', now)).toEqual({ from: '2026-10-01', to: '2026-10-17' });
  expect(presetRange('last-quarter', now)).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  expect(presetOf(presetRange('last-quarter', now), now)).toBe('last-quarter');
  expect(presetOf({ from: '2026-01-01', to: '2026-02-01' }, now)).toBeNull();
  const url = writeQuery({ kind: 'board', id: 'b1' }, { from: '2026-07-01', to: '2026-09-30' });
  expect(url).toBe('/reports?board=b1&from=2026-07-01&to=2026-09-30');
  expect(readQuery(new URLSearchParams(url.split('?')[1]), now)).toEqual({ scope: { kind: 'board', id: 'b1' }, range: { from: '2026-07-01', to: '2026-09-30' } });
  // a broken range falls back to the last 90 days; no scope is nothing to show
  expect(readQuery(new URLSearchParams('board=b1&from=2026-10-01&to=2026-01-01'), now).range).toEqual(presetRange('last-90', now));
  expect(readQuery(new URLSearchParams(''), now).scope).toBeNull();
  expect(writeQuery({ kind: 'org' }, { from: '2026-07-01', to: '2026-09-30' })).toBe('/reports?org=1&from=2026-07-01&to=2026-09-30');
});

test('trends and scope change', () => {
  expect(trend(0.8, 0.7)).toBe('up');
  expect(trend(0.7, 0.8)).toBe('down');
  expect(trend(0.801, 0.8)).toBe('same');
  expect(trend(0.8, null)).toBeNull();
  expect(scopeChange(report.totals)).toBeCloseTo(1 / 7);
  expect(scopeChange(report.previous)).toBeNull(); // not recorded then
});

test('the Sprint report link is on every board’s Past sprints (no flag)', () => {
  expect(renderToStaticMarkup(<ReportLink boardId="b1" />)).toContain('href="/reports?board=b1"');
});
