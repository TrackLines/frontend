import { expect, test } from 'bun:test';
import { afterDelete, closedAs, ticketActions } from './ticket-page';

test('the ticket page offers send-to-backlog from a board, won’t do for open backlog tickets', () => {
  expect(ticketActions({ board_id: 'b', project_id: 'p', done: false })).toEqual({ sendToBacklog: true, wontDo: false });
  expect(ticketActions({ board_id: null, project_id: 'p', done: false })).toEqual({ sendToBacklog: false, wontDo: true });
  expect(ticketActions({ board_id: null, project_id: 'p', done: true })).toEqual({ sendToBacklog: false, wontDo: false });
});

test('after deleting, back to its board or the project backlog', () => {
  expect(afterDelete({ board_id: 'b1', project_id: 'p', done: false })).toBe('/boards/b1');
  expect(afterDelete({ board_id: null, project_id: 'p1', done: false })).toBe('/projects/p1#backlog');
});

test('a finished ticket says how it finished', () => {
  const at = '2026-10-01T10:00:00Z';
  expect(closedAs({ done_at: null, resolution: null, resolved_at: null })).toBeNull();
  expect(closedAs({ done_at: at, resolution: 'duplicate', resolved_at: at })).toBe('marked duplicate');
  expect(closedAs({ done_at: at, resolution: 'wont_do', resolved_at: at })).toBe('closed as won’t do');
  expect(closedAs({ done_at: at, resolution: 'done', resolved_at: at })).toBe('resolved');
  expect(closedAs({ done_at: at, resolution: null, resolved_at: null })).toBe('done');
});
