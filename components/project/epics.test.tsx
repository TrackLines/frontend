import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { EpicsView, epicSize } from './epics';
import { byBoard } from '@/components/ticket/sub-tickets';
import { pickerTypes, TICKET_TYPES } from '@/components/ticket-type';
import { convertLeavesBoard } from '@/components/board/ticket-dialog';

test('an epic’s progress and size read plainly (TL-214)', () => {
  expect(epicSize({ done: 3, total: 5, points: 13, unestimated: 2 })).toBe('3 of 5 done · 13 points · 2 not sized');
  expect(epicSize({ done: 0, total: 1, points: 1, unestimated: 0 })).toBe('0 of 1 done · 1 point');
  expect(epicSize({ done: 0, total: 0, points: 0, unestimated: 0 })).toBe('No sub-tickets yet');
});

test('the project’s Epics section lists each epic with its progress, or says how to make one', () => {
  const html = renderToStaticMarkup(<EpicsView epics={[
    { id: 'e1', key: 'TL-9', title: 'Checkout', priority: 'medium', done: false, resolution: null, progress: { done: 1, total: 4, points: 11, unestimated: 1 } },
    { id: 'e2', key: 'TL-3', title: 'Old', priority: 'low', done: true, resolution: 'wont_do', progress: { done: 0, total: 0, points: 0, unestimated: 0 } },
  ]} />);
  expect(html).toContain('href="/tickets/e1"');
  expect(html).toContain('1 of 4 done · 11 points · 1 not sized');
  expect(html).toContain('Won’t do');
  expect(renderToStaticMarkup(<EpicsView epics={[]} />)).toContain('No epics yet');
  expect(renderToStaticMarkup(<EpicsView epics={null} />)).toBe('');
});

test('an epic’s page groups its sub-tickets by board, the backlog last', () => {
  const groups = byBoard([
    { id: 'a', title: 'a', done: false, board_name: 'Web' },
    { id: 'b', title: 'b', done: true, board_name: null },
    { id: 'c', title: 'c', done: false, board_name: 'Backend' },
    { id: 'd', title: 'd', done: false, board_name: 'Web' },
  ]);
  expect(groups.map((g) => `${g.board}:${g.children.map((c) => c.id).join('')}`)).toEqual(['Backend:c', 'Web:ad', 'Backlog:b']);
});

test('Epic is offered everywhere but creating on a board; converting a board ticket takes it off the board', () => {
  expect(TICKET_TYPES.map((t) => t.value)).toContain('epic');
  expect(pickerTypes('task', false).map((t) => t.value)).not.toContain('epic');
  expect(pickerTypes('task', true).map((t) => t.value)).toContain('epic');
  expect(pickerTypes('epic', false).map((t) => t.value)).toContain('epic'); // an epic shows as one
  expect(convertLeavesBoard({ type: 'feature', column_id: 'c1' }, 'epic')).toBe(true);
  expect(convertLeavesBoard({ type: 'feature', column_id: null }, 'epic')).toBe(false); // already in the backlog
  expect(convertLeavesBoard({ type: 'epic', column_id: 'c1' }, 'epic')).toBe(false);
  expect(convertLeavesBoard(undefined, 'epic')).toBe(false);
});

test('epics stay out of refinement: they aren’t planned, their sub-tickets are', async () => {
  const src = await Bun.file(new URL('./refinement.tsx', import.meta.url)).text();
  expect(src).toContain("t.type !== 'epic'");
  // the project page shows Backlog and Epics as tabs, Backlog open (TL-385)
  const tabs = await Bun.file(new URL('./work-tabs.tsx', import.meta.url)).text();
  expect(tabs).toContain('<Epics ');
  expect(tabs).toContain('<Backlog ');
  expect(await Bun.file(new URL('../../app/projects/[id]/page.tsx', import.meta.url)).text()).toContain('<WorkTabs ');
});

test('a long epic title truncates inside its card instead of running past the edge (TL-403)', () => {
  const title = 'Exportable sprint reports at board, project and org level';
  const html = renderToStaticMarkup(<EpicsView epics={[{ id: 'e1', key: 'TL-396', title, priority: 'medium', done: false, resolution: null, progress: { done: 0, total: 6, points: 0, unestimated: 6 } }]} />);
  const card = html.match(/<a [^>]*href="\/tickets\/e1"[^>]*>/)?.[0] ?? '';
  expect(card).toContain('grid-cols-1'); // minmax(0,1fr): the column can't grow wider than the card
  expect(html).toMatch(new RegExp(`class="[^"]*min-w-0[^"]*truncate[^"]*">${title}<`));
});
