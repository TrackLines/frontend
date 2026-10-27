import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import type { Board, Capacity, PlannedSprint, Ticket } from '@/lib/api';
import { NextSprintsView } from './next-sprints';

const board = { id: 'b1', project_id: 'p1', name: 'Backend', estimate_scale: 'fibonacci' } as Board;
const capacity: Capacity = { unit: 'points', velocity: 20, cap: 22, used: 8, unestimated: 0, over: false, approved_total: null, approved_by: null, approved_at: null, needs_approval: false };
const plan = { id: 'ps1', board_id: 'b1', position: 1, number: 6, length_days: 14, goal: 'Admin panel', capacity,
  tickets: [{ id: 't1', key: 'TL-573', title: 'Staff access', estimate: '3', column_id: null, position: 0, description: '', created_by: 'u' } as unknown as Ticket] } as PlannedSprint;
const view = (p: Partial<Parameters<typeof NextSprintsView>[0]>) =>
  render(<NextSprintsView board={board} plans={[plan]} error="" canManage={false} busy={false} token="t" act={async () => {}} {...p} />);

// TL-584: the board shows what's planned for its next sprints.
test('each planned sprint with its tickets; read-only for members, editable for managers', () => {
  const html = view({});
  for (const s of ['Sprint 6', 'Staff access', 'TL-573', 'href="/projects/p1"', 'Refine']) expect(html).toContain(s);
  expect(html).not.toContain('>Remove<');
  expect(view({ canManage: true })).toContain('>Remove<');
});

test('loading, nothing planned, and a failed load', () => {
  expect(view({ plans: null })).toContain('Loading…');
  expect(view({ plans: [] })).toContain('No sprints are planned yet.');
  const failed = view({ plans: null, error: 'Couldn’t load the next sprints. Please try again.' });
  expect(failed).toContain('role="alert"');
  expect(failed).not.toContain('Loading…');
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('the backlog asks for unplanned, planned or all tickets', async () => {
  const { backlog } = await import('@/lib/api');
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => { urls.push(String(url)); return Response.json({ tickets: [], counts: {}, labels: [], total: 0 }); }) as unknown as typeof fetch;
  await backlog.page('p1', { page: 1, perPage: 25, planned: 'exclude' }, 'tok');
  await backlog.page('p1', { page: 1, perPage: 25, planned: 'only' }, 'tok');
  await backlog.page('p1', { page: 1, perPage: 25, planned: 'all' }, 'tok');
  expect(urls[0]).toContain('planned=exclude');
  expect(urls[1]).toContain('planned=only');
  expect(urls[2]).not.toContain('planned=');
});

test('the backlog’s planned filter shows its labels', async () => {
  const { PlannedSelect } = await import('@/components/project/backlog-sort');
  expect(render(<PlannedSelect planned="exclude" onPlannedChange={() => {}} />)).toMatch(/data-slot="select-value"[^>]*>Unplanned</);
  expect(render(<PlannedSelect planned="all" onPlannedChange={() => {}} />)).toMatch(/data-slot="select-value"[^>]*>Planned and unplanned</);
});
