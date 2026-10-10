import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Capacity, PlannedSprint, Ticket } from '@/lib/api';
import { PlannedSprintCard, RefinementMode } from './refinement';

const capacity = (c: Partial<Capacity>): Capacity => ({
  unit: 'points', velocity: 8, cap: 8.8, used: 0, unestimated: 0, over: false,
  approved_total: null, approved_by: null, approved_at: null, needs_approval: false, ...c,
});
const ticket = (id: string, estimate: string | null) =>
  ({ id, column_id: '', title: `Ticket ${id}`, description: '', position: 0, created_by: 'u', estimate }) as Ticket;
const plan = (p: Partial<PlannedSprint>): PlannedSprint =>
  ({ id: 'p1', board_id: 'b', position: 1, number: 5, length_days: 14, tickets: [], capacity: capacity({}), ...p });
const card = (p: PlannedSprint, canManage: boolean) => renderToStaticMarkup(
  <PlannedSprintCard plan={p} scale="fibonacci" canManage={canManage} busy={false} token="t" act={async () => {}} />,
);

test('loading', () => {
  const boards = [{ id: 'b', name: 'Backend', style: 'sprints' }, { id: 'k', name: 'Ops', style: 'kanban' }] as never;
  expect(renderToStaticMarkup(<RefinementMode projectId="p" boards={boards} token="t" onClose={() => {}} />)).toContain('Loading…');
  // kanban boards don't plan sprints
  const kanbanOnly = [{ id: 'k', name: 'Ops', style: 'kanban' }] as never;
  expect(renderToStaticMarkup(<RefinementMode projectId="p" boards={kanbanOnly} token="t" onClose={() => {}} />)).toContain('No sprint boards to plan for yet.');
});

test('empty plan with no velocity yet', () => {
  const html = card(plan({ capacity: capacity({ velocity: null, cap: null }) }), false);
  expect(html).toContain('Sprint 5');
  expect(html).toContain('no velocity yet');
  expect(html).toContain('No tickets planned yet');
  expect(html).not.toContain('Remove'); // only admins and team leaders manage plans
});

test('within capacity: bar, sizing, move out', () => {
  const html = card(plan({ tickets: [ticket('a', '5'), ticket('b', null)], capacity: capacity({ used: 5, unestimated: 1 }) }), true);
  expect(html).toContain('5 / 8.8 points · 1 unestimated');
  expect(html).toContain('Sprint 5 capacity');
  expect(html).toContain('Move out');
  expect(html).not.toContain('Needs approval');
});

test('over capacity: admins and leaders can approve, others see why it won’t start', () => {
  const over = plan({ capacity: capacity({ used: 10, over: true, needs_approval: true }) });
  const manager = card(over, true);
  expect(manager).toContain('Needs approval');
  expect(manager).toContain('1.2 over: needs approval to start, or move tickets out');
  expect(manager).toContain('Approve 10 points');
  const member = card(over, false);
  expect(member).toContain('Needs approval');
  expect(member).not.toContain('Approve 10');
  const approved = card(plan({ capacity: capacity({ used: 10, over: true, approved_total: 10 }) }), true);
  expect(approved).toContain('Approved');
  expect(approved).not.toContain('Approve 10');
});
