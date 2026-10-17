import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { delivered, RollupView } from './rollup-view';
import { OrgReportCard, ProjectReportLink } from './report-links';
import { FeatureFlags } from '@/components/feature-flags';
import type { BoardReport, ReportTotals, RollupReport } from '@/lib/api';

const totals = (o: Partial<ReportTotals>): ReportTotals => ({ sprints: 1, planned: 8, done: 8, predictability: 1, added: 0, carried: 0, velocity: 8, mix: [], ...o });
const board = (id: string, name: string, unit: 'points' | 'tickets', t: ReportTotals): BoardReport => ({
  board_id: id, board_name: name, unit, from: '', to: '', summary: '', totals: t, previous: totals({ sprints: 0, predictability: null }),
  sprints: [{ number: 1, starts_at: '2026-08-01T00:00:00Z', ends_at: '2026-08-15T00:00:00Z', closed_at: '2026-08-15T00:00:00Z', goal: 'g', goal_met: t.predictability === 1, planned: t.planned, done: t.done, predictability: t.predictability, added: 0, removed: 0, carried: 0, velocity: t.done, approved_over: null, mix: [] }],
});
const range = { from: '2026-08-01', to: '2026-09-30' };
const project: RollupReport = {
  id: 'p1', name: 'Shop', from: '', to: '',
  boards: [board('b1', 'Backend', 'points', totals({})), board('b2', 'Design', 'tickets', totals({ planned: 2, done: 1, predictability: 0.5 }))],
  points: totals({}), tickets: totals({ planned: 2, done: 1, predictability: 0.5 }),
  overall: { sprints: 2, predictability: 0.75, goals_set: 2, goals_met: 1 }, previous: { sprints: 1, predictability: 0.6, goals_set: 0, goals_met: 0 },
  months: [{ month: '2026-08', sprints: 1, predictability: 1, points_done: 8, tickets_done: 0 }, { month: '2026-09', sprints: 1, predictability: 0.5, points_done: 0, tickets_done: 1 }],
  summary: 'Across 2 boards, delivered 75% of planned work in 2 sprints. 1 of 2 sprint goals met.',
};

test('a project report: boards side by side, by month, points and tickets apart, each board linked to its own report (TL-400)', () => {
  const html = renderToStaticMarkup(<RollupView report={project} range={range} />);
  expect(html).toContain('Across 2 boards, delivered 75% of planned work');
  for (const s of ['75%', 'aria-label="up on the period before"', '1 of 2', 'Points delivered', 'Tickets delivered', 'never added together']) expect(html).toContain(s);
  for (const chart of ['Boards side by side', 'Predictability by month', 'Delivered by month']) expect(html).toContain(`aria-label="${chart}"`);
  expect(html).toContain('href="/reports?board=b1&amp;from=2026-08-01&amp;to=2026-09-30"'); // drill into a board, same period
  expect(html).toContain('8 points');
  expect(html).toContain('1 tickets');
  for (const banned of ['assign', 'user_']) expect(html).not.toContain(banned);
});

test('the organization report is by project, each linking to its project report', () => {
  const org: RollupReport = { ...project, id: undefined, name: 'Organization', boards: undefined, projects: [{ ...project, boards: undefined, months: undefined }] };
  const html = renderToStaticMarkup(<RollupView report={org} range={range} />);
  expect(html).toContain('aria-label="Projects side by side"');
  expect(html).toContain('href="/reports?project=p1&amp;from=2026-08-01&amp;to=2026-09-30"');
  expect(delivered(totals({ done: 13 }), totals({ done: 4 }))).toBe('13 points · 4 tickets');
  expect(delivered(null, null)).toBe('–');
});

test('nothing finished: says so', () => {
  const empty: RollupReport = { ...project, boards: [], months: [], overall: { sprints: 0, predictability: null, goals_set: 0, goals_met: 0 }, summary: 'No sprints finished in this period.' };
  expect(renderToStaticMarkup(<RollupView report={empty} range={range} />)).toContain('No sprints finished in this period. Try a longer one.');
});

test('the project button and the org settings card wait for the sprint-reports flag', () => {
  expect(renderToStaticMarkup(<FeatureFlags><ProjectReportLink projectId="p1" /></FeatureFlags>)).toBe('');
  expect(renderToStaticMarkup(<FeatureFlags><OrgReportCard /></FeatureFlags>)).toBe('');
});
