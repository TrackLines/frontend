import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { PastSprintList, SprintDetailBody, sprintResult } from './past-sprints';
import { SprintBar, closeSummary } from './sprint-bar';

const sprint = (number: number) => ({ id: 's', board_id: 'b', number, length_days: 14, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-15T00:00:00Z', closed_at: null });
const board = { id: 'b', project_id: 'p', owner_clerk_id: 'o', name: 'B', description: '', created_at: '', updated_at: '' };
const bar = (s: ReturnType<typeof sprint> | undefined) => renderToStaticMarkup(<SprintBar board={{ ...board, sprint: s }} token="x" canManage={false} onChanged={() => {}} />);

test('charts need a running sprint; past sprints need history, which there may be between sprints', () => {
  expect(bar(undefined)).not.toContain('Charts');
  expect(bar(undefined)).toContain('Past sprints'); // closed by hand: the next sprint hasn't started yet
  expect(bar(sprint(1))).toContain('Charts');
  expect(bar(sprint(1))).not.toContain('Past sprints');
  expect(bar(sprint(3))).toContain('Past sprints');
});

test('a past sprint lists what it finished, with the closed-scope note', () => {
  const html = renderToStaticMarkup(<SprintDetailBody detail={{
    ...sprint(2), closed_at: '2026-10-14T00:00:00Z', unit: 'points', carried_over: 2,
    burn: { number: 2, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-14T00:00:00Z', total: 8, unestimated: 0, done: [{ at: '2026-10-05T00:00:00Z', value: 5 }] },
    tickets: [{ id: 't1', key: 'TL-1', column_id: 'c', title: 'Shipped it', description: '', position: 0, created_by: 'u', estimate: '5' }],
  }} />);
  expect(html).toContain('Shipped it');
  expect(html).toContain('TL-1');
  expect(html).toContain('href="/tickets/t1"');
  expect(html).toContain('5 of 8 points done in sprint 2');
  expect(html).toContain('what the sprint held when it closed');
});

test('the past sprints list shows what each sprint finished of what it held', () => {
  const closed = (n: number) => ({ ...sprint(n), id: `s${n}`, closed_at: '2026-10-14T00:00:00Z' });
  const html = renderToStaticMarkup(<PastSprintList list={[closed(2), closed(1)]} onOpen={() => {}} velocity={{
    unit: 'points', current: null,
    sprints: [{ number: 1, starts_at: '', closed_at: '', completed: 3, planned: null }, { number: 2, starts_at: '', closed_at: '', completed: 5, planned: 8 }],
  }} />);
  expect(html).toContain('5 of 8 points done');
  expect(html).toContain('3 points done'); // closed before what it held was recorded
  expect(html.indexOf('Sprint 2')).toBeLessThan(html.indexOf('5 of 8'));
  expect(renderToStaticMarkup(<PastSprintList list={[closed(1)]} velocity={null} onOpen={() => {}} />)).not.toContain('done'); // numbers didn't load
});

test('sprint results read naturally in points or tickets', () => {
  expect(sprintResult('tickets', 3, 4)).toBe('3 of 4 tickets done');
  expect(sprintResult('tickets', 1, 1)).toBe('1 of 1 ticket done');
  expect(sprintResult('points', 1, null)).toBe('1 point done');
  expect(sprintResult('points', 2.5, 7.25)).toBe('2.5 of 7.3 points done');
});

test('closing by hand says the next sprint waits, so its length can be chosen', () => {
  const text = closeSummary(3, 2, 1, 'Done');
  expect(text).toContain('2 unfinished tickets stay on the board');
  expect(text).toContain('1 in “Done” stays with sprint 3');
  expect(text).toContain('doesn’t start until you start it');
  expect(closeSummary(3, 1, 0, 'Shipped')).toContain('1 unfinished ticket stays');
});
