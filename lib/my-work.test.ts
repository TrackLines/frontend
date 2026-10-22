import { expect, test } from 'bun:test';
import type { TicketSearchResult } from './api';
import { boardOptions, groupWork, workQuery } from './my-work';

const t = (id: string, project: string, board: string | null, boardId: string | null = board) =>
  ({ id, project_name: project, board_name: board, board_id: boardId, title: id }) as TicketSearchResult;

test('grouped by project, then board or backlog, in the order they came', () => {
  const g = groupWork([t('a', 'Shop', 'Web'), t('b', 'Docs', null), t('c', 'Shop', 'API'), t('d', 'Shop', 'Web')]);
  expect(g.map((x) => x.project)).toEqual(['Shop', 'Docs']);
  expect(g[0].boards.map((b) => [b.name, b.tickets.map((x) => x.id)])).toEqual([['Web', ['a', 'd']], ['API', ['c']]]);
  expect(g[1].boards[0].name).toBe('Backlog');
  expect(groupWork([])).toEqual([]);
});

test('each tab searches by the right filter (TL-500)', () => {
  expect(workQuery('assigned')).toEqual({ assignee: 'me' });
  expect(workQuery('created')).toEqual({ creator: 'me' });
});

test('board filter options come from my tickets', () => {
  expect(boardOptions([t('a', 'Shop', 'Web', 'w'), t('b', 'Docs', null), t('c', 'Shop', 'Web', 'w'), t('d', 'Docs', 'Site', 's')]))
    .toEqual([{ id: 's', name: 'Docs · Site' }, { id: 'w', name: 'Shop · Web' }]);
});
