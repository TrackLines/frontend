import { expect, test } from 'bun:test';
import { boardAccess, canAddTicket, shownTickets, type BoardFilters } from './board-view';
import type { Ticket } from '@/lib/api';

const t = (id: string, extra: Partial<Ticket> = {}): Ticket => ({ id, column_id: 'c', position: 0, title: id, description: '', created_by: 'x', ...extra });
const tickets = [
  t('mine-urgent-ui', { assigned_to: 'me', priority: 'urgent', labels: ['ui'] }),
  t('bo-low-api', { assigned_to: 'bo', priority: 'low', labels: ['api'] }),
  t('nobody-urgent-api', { priority: 'urgent', labels: ['api'] }),
];
const none: BoardFilters = { labels: [], priorities: [], assignee: 'all', me: 'me', turn: null, editing: false };
const ids = (f: Partial<BoardFilters>) => shownTickets(tickets, { ...none, ...f }).map((x) => x.id);

test('the board filters combine: labels, priorities, mine / unassigned', () => {
  expect(ids({})).toEqual(['mine-urgent-ui', 'bo-low-api', 'nobody-urgent-api']);
  expect(ids({ labels: ['api'] })).toEqual(['bo-low-api', 'nobody-urgent-api']);
  expect(ids({ labels: ['api'], priorities: ['urgent'] })).toEqual(['nobody-urgent-api']);
  expect(ids({ assignee: 'mine' })).toEqual(['mine-urgent-ui']);
  expect(ids({ assignee: 'unassigned', priorities: ['urgent'] })).toEqual(['nobody-urgent-api']);
});

test('in standup only the speaker’s tickets show; editing shows everything', () => {
  expect(ids({ turn: 'bo' })).toEqual(['bo-low-api']);
  expect(ids({ turn: 'bo', labels: ['ui'] })).toEqual([]);
  expect(ids({ editing: true, labels: ['nothing'], turn: 'bo' })).toHaveLength(3);
});

test('board settings open only with permissions checked for this board (fail closed)', () => {
  expect(boardAccess({ checkedBoard: 'b1', board: 'b1', canManage: true, isAdmin: true, editMode: true })).toEqual({ manage: true, admin: true, editing: true });
  expect(boardAccess({ checkedBoard: 'b0', board: 'b1', canManage: true, isAdmin: true, editMode: true })).toEqual({ manage: false, admin: false, editing: false });
  expect(boardAccess({ checkedBoard: 'b1', board: 'b1', canManage: null, isAdmin: false, editMode: true })).toEqual({ manage: false, admin: false, editing: false });
  expect(boardAccess({ checkedBoard: 'b1', board: 'b1', canManage: true, isAdmin: false, editMode: false }).editing).toBe(false);
});

test('"+ Add ticket": not while editing, not on archived boards, not in Done unless it is the only column', () => {
  expect(canAddTicket({ editing: false, archived: false, done: false, columns: 3 })).toBe(true);
  expect(canAddTicket({ editing: true, archived: false, done: false, columns: 3 })).toBe(false);
  expect(canAddTicket({ editing: false, archived: true, done: false, columns: 3 })).toBe(false);
  expect(canAddTicket({ editing: false, archived: false, done: true, columns: 3 })).toBe(false);
  expect(canAddTicket({ editing: false, archived: false, done: true, columns: 1 })).toBe(true);
});
