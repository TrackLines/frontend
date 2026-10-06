import { expect, test } from 'bun:test';
import type { Column } from '@/lib/api';
import { moveTicket, placement } from './move';

const t = (id: string, col: string) => ({ id, column_id: col, title: id, description: '', position: 0, created_by: 'test' });
const board = (): Column[] => [
  { id: 'todo', name: 'To do', position: 0, tickets: [t('a', 'todo'), t('b', 'todo'), t('c', 'todo')] },
  { id: 'doing', name: 'In progress', position: 1, tickets: [t('d', 'doing')] },
  { id: 'done', name: 'Done', position: 2, tickets: [] },
];
const ids = (cols: Column[]) => Object.fromEntries(cols.map((c) => [c.id, c.tickets.map((x) => x.id).join('')]));

test('reorder within a column (down and up)', () => {
  expect(ids(moveTicket(board(), 'a', 'c'))).toEqual({ todo: 'bca', doing: 'd', done: '' });
  expect(ids(moveTicket(board(), 'c', 'a'))).toEqual({ todo: 'cab', doing: 'd', done: '' });
});

test('move onto a ticket in another column takes its place', () => {
  const cols = moveTicket(board(), 'b', 'd');
  expect(ids(cols)).toEqual({ todo: 'ac', doing: 'bd', done: '' });
  expect(cols[1].tickets[0].column_id).toBe('doing');
  expect(placement(cols, 'b')).toEqual({ columnId: 'doing', position: 0 });
});

test('drop on an (empty) column goes to the bottom', () => {
  expect(ids(moveTicket(board(), 'a', 'done'))).toEqual({ todo: 'bc', doing: 'd', done: 'a' });
  expect(ids(moveTicket(board(), 'a', 'doing'))).toEqual({ todo: 'bc', doing: 'da', done: '' });
});

test('no-ops keep the same array', () => {
  const cols = board();
  expect(moveTicket(cols, 'a', 'a')).toBe(cols);
  expect(moveTicket(cols, 'a', 'todo')).toBe(cols);
  expect(moveTicket(cols, 'zzz', 'todo')).toBe(cols);
});
