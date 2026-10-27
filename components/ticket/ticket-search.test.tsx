import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { assigneeChoices, SearchResults, searchKey } from './ticket-search';
import type { TicketSearchResult } from '@/lib/api';

const r = (id: string, extra: Partial<TicketSearchResult> = {}) => ({
  id, key: `TL-${id}`, title: `Ticket ${id}`, column_id: 'c', position: 0, description: '', created_by: 'x', type: 'bug',
  project_name: 'TrackLines', board_id: 'b', board_name: 'Backend', column_name: 'To do', done: false, snippet: '', ...extra,
}) as TicketSearchResult;
const results = (props: Partial<Parameters<typeof SearchResults>[0]>) =>
  renderToStaticMarkup(<SearchResults results={[]} loading={false} error="" active={0} onChoose={() => {}} onActive={() => {}} onRetry={() => {}} {...props} />);

test('results show where each ticket lives, with the active one selected', () => {
  const html = results({ results: [r('1', { snippet: '…login fails…', priority: 'urgent' }), r('2', { board_name: null, column_name: null })], active: 1 });
  for (const s of ['TL-1', 'Ticket 1', '…login fails…', 'TrackLines · Backend · To do', 'TrackLines · Backlog', 'Urgent', 'Copy ticket key TL-2']) expect(html).toContain(s);
  expect(html).toMatch(/id="search-result-2"[^>]*aria-selected="true"/);
  expect(html).toMatch(/id="search-result-1"[^>]*aria-selected="false"/);
});

test('error, searching and nothing found', () => {
  const failed = results({ error: 'Couldn’t search tickets.' });
  expect(failed).toContain('role="alert"');
  expect(failed).toContain('Try again');
  expect(failed).not.toContain('tickets found');
  expect(results({ loading: true })).toContain('Searching…');
  expect(results({})).toContain('No tickets match this search.');
});

test('the assignee filter offers people and agents, not me (that is "Assigned to me") and not service keys', () => {
  expect(assigneeChoices([{ id: 'me', label: 'You', kind: 'person' }, { id: 'u2', label: 'Bo', kind: 'person' }, { id: 'Claude', label: 'Claude', kind: 'ai' }, { id: 'Bugfixes', label: 'Bugfixes', kind: 'service' }], 'me')
    .map((p) => p.id)).toEqual(['u2', 'Claude']);
});

test('screen readers hear how many matched', () => {
  expect(results({ results: [r('1'), r('2')] })).toMatch(/aria-live="polite"[^>]*>2 tickets found/);
  expect(results({ loading: true })).not.toContain('tickets found');
});

test('arrow keys move through the results and Enter opens the highlighted one', () => {
  expect(searchKey('ArrowDown', 0, 3)).toBe(1);
  expect(searchKey('ArrowDown', 2, 3)).toBe(2); // stays on the last
  expect(searchKey('ArrowDown', 0, 0)).toBe(0);
  expect(searchKey('ArrowUp', 0, 3)).toBe(0);
  expect(searchKey('ArrowUp', 2, 3)).toBe(1);
  expect(searchKey('Enter', 1, 3)).toBe('open'); // a key such as TL-123 comes first, so Enter opens it
  expect(searchKey('Enter', 0, 0)).toBeNull(); // nothing to open
  expect(searchKey('a', 0, 3)).toBeNull(); // typing is the input's
});
