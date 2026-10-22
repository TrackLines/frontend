import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TicketSearchResult } from '@/lib/api';
import { MyWorkView } from './my-work';

const t = (over: Partial<TicketSearchResult>) => ({
  id: 'id', key: 'TL-1', title: 'Fix login', description: '', position: 0, created_by: 'u', column_id: 'c', type: 'bug', priority: 'urgent',
  project_name: 'Shop', board_id: 'b', board_name: 'Web', column_name: 'In progress', done: false, snippet: '', blocked: false,
  updated_at: '2026-10-11T09:00:00Z', ...over,
}) as TicketSearchResult;
const view = (items: TicketSearchResult[] | null, failed = false, filtered = false) => renderToStaticMarkup(<MyWorkView items={items} failed={failed} filtered={filtered} />);

test('grouped by project and board, with status, priority and a link', () => {
  const html = view([t({}), t({ id: 'b2', key: 'TL-2', title: 'Write docs', project_name: 'Docs', board_id: null, board_name: null, column_name: null, priority: 'medium' })]);
  for (const s of ['>Shop<', '>Web<', '>Docs<', '>Backlog<', 'Fix login', 'href="/tickets/id"', 'In progress', 'TL-2']) expect(html).toContain(s);
  expect(html.indexOf('Shop')).toBeLessThan(html.indexOf('Docs')); // most recently changed group first
});

test('blocked and done work is marked', () => {
  expect(view([t({ blocked: true })])).toContain('Blocked');
  expect(view([t({ done: true })])).toContain('>Done<');
});

test('loading, error and empty states', () => {
  expect(view(null)).toContain('Loading your work');
  expect(view([], true)).toContain('Couldn&#x27;t load your work');
  expect(view([])).toContain('Nothing assigned to you right now');
  expect(view([], false, true)).toContain('Nothing of yours matches these filters');
});

test('the Created by me tab shows its own empty message (TL-500)', () => {
  const html = renderToStaticMarkup(<MyWorkView items={[]} failed={false} filtered={false} empty="You haven’t created any tickets yet." />);
  expect(html).toContain('You haven');
  expect(html).not.toContain('Nothing assigned to you');
});
