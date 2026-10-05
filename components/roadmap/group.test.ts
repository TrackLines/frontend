import { expect, test } from 'bun:test';
import { groupByMonth } from './group';

const item = (title: string, target_date: string | null, position: number) =>
  ({ id: title, title, description: '', target_date, position });

test('groups by month, oldest first, undated last', () => {
  const groups = groupByMonth([
    item('later', null, 0),
    item('dec-b', '2026-12-20', 2),
    item('jan', '2027-01-01', 3),
    item('dec-a', '2026-12-01', 1),
    item('later2', null, 4),
  ]);
  expect(groups.map((g) => [g.label, g.items.map((i) => i.title)])).toEqual([
    ['December 2026', ['dec-a', 'dec-b']],
    ['January 2027', ['jan']],
    ['Later', ['later', 'later2']],
  ]);
});

test('first of month stays in that month regardless of timezone', () => {
  expect(groupByMonth([item('x', '2027-03-01', 0)])[0].label).toBe('March 2027');
});

test('empty', () => {
  expect(groupByMonth([])).toEqual([]);
});
