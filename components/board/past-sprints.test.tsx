import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SprintDetailBody } from './past-sprints';
import { SprintBar } from './sprint-bar';

const sprint = (number: number) => ({ id: 's', board_id: 'b', number, length_days: 14, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-15T00:00:00Z', closed_at: null });
const board = { id: 'b', project_id: 'p', owner_clerk_id: 'o', name: 'B', description: '', created_at: '', updated_at: '' };
const bar = (s: ReturnType<typeof sprint> | undefined) => renderToStaticMarkup(<SprintBar board={{ ...board, sprint: s }} token="x" canManage={false} onChanged={() => {}} />);

test('charts need a running sprint; past sprints need history', () => {
  expect(bar(undefined)).not.toContain('Charts');
  expect(bar(undefined)).not.toContain('Past sprints');
  expect(bar(sprint(1))).toContain('Charts');
  expect(bar(sprint(1))).not.toContain('Past sprints');
  expect(bar(sprint(3))).toContain('Past sprints');
});

test('a past sprint lists what it finished, with the closed-scope note', () => {
  const html = renderToStaticMarkup(<SprintDetailBody detail={{
    ...sprint(2), closed_at: '2026-10-14T00:00:00Z', unit: 'points', carried_over: 2,
    burn: { number: 2, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-14T00:00:00Z', total: 8, unestimated: 0, done: [{ at: '2026-10-05T00:00:00Z', value: 5 }] },
    tickets: [{ id: 't1', column_id: 'c', title: 'Shipped it', description: '', position: 0, created_by: 'u', estimate: '5' }],
  }} />);
  expect(html).toContain('Shipped it');
  expect(html).toContain('href="/tickets/t1"');
  expect(html).toContain('5 of 8 points done in sprint 2');
  expect(html).toContain('what the sprint held when it closed');
});
