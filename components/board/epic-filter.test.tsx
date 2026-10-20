import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { EpicFilter, epicQuery, filterTicketsByEpic, parseEpic } from './epic-filter';
import { shownTickets } from '@/lib/board-view';
import { backlog, type EpicSummary, type Ticket } from '@/lib/api';

const epic = (id: string, title: string, done = false): EpicSummary =>
  ({ id, key: `TL-${id}`, title, priority: 'medium', done, resolution: done ? 'done' : null, progress: { done: 0, total: 0, points: 0, unestimated: 0 } });
const ticket = (id: string, epic_id: string | null): Ticket =>
  ({ id, column_id: 'c', title: id, description: '', position: 0, created_by: 'u', epic_id } as Ticket);

test('the epic filter lives in the URL beside the other filters (TL-215)', () => {
  expect(parseEpic(new URLSearchParams('label=ui&epic=e1'))).toBe('e1');
  expect(parseEpic(new URLSearchParams('label=ui'))).toBe('');
  expect(epicQuery('label=ui&priority=high', 'e1')).toBe('label=ui&priority=high&epic=e1');
  expect(epicQuery('label=ui&epic=e1', '')).toBe('label=ui');
});

test('a board shows only the chosen epic’s tickets, with the other filters still applying', () => {
  const ts = [ticket('a', 'e1'), ticket('b', 'e2'), ticket('c', null)];
  expect(filterTicketsByEpic(ts, 'e1').map((t) => t.id)).toEqual(['a']);
  expect(filterTicketsByEpic(ts, '').map((t) => t.id)).toEqual(['a', 'b', 'c']);
  const base = { labels: [], priorities: [], assignee: 'all' as const, me: 'u', turn: null, editing: false };
  expect(shownTickets(ts, { ...base, epic: 'e2' }).map((t) => t.id)).toEqual(['b']);
});

test('the filter shows when there are open epics, or one is chosen (so it can be cleared)', () => {
  const none = renderToStaticMarkup(<EpicFilter epics={[epic('e9', 'Finished', true)]} epic="" onEpicChange={() => {}} />);
  expect(none).toBe('');
  const chosen = renderToStaticMarkup(<EpicFilter epics={[epic('e1', 'Checkout'), epic('e2', 'Search')]} epic="e1" onEpicChange={() => {}} />);
  expect(chosen).toContain('Epic');
  expect(chosen).toContain('Checkout');
  expect(renderToStaticMarkup(<EpicFilter epics={[epic('e1', 'Checkout')]} epic="" onEpicChange={() => {}} />)).toContain('Epic');
});

test('the backlog asks the server for the epic’s tickets', async () => {
  const realFetch = globalThis.fetch;
  let asked = '';
  globalThis.fetch = ((url: string) => { asked = String(url); return Promise.resolve(new Response('{"tickets":[],"counts":{},"labels":[]}')); }) as unknown as typeof fetch;
  try {
    await backlog.page('p1', { page: 1, perPage: 25, epic: 'e1' }, 't');
    expect(asked).toContain('epic=e1');
    await backlog.page('p1', { page: 1, perPage: 25 }, 't');
    expect(asked).not.toContain('epic=');
  } finally {
    globalThis.fetch = realFetch;
  }
});
