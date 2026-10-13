import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { assigneeChoices, SearchResults } from './ticket-search';
import type { TicketSearchResult } from '@/lib/api';

const r = (id: string, extra: Partial<TicketSearchResult> = {}) => ({
  id, key: `TL-${id}`, title: `Ticket ${id}`, column_id: 'c', position: 0, description: '', created_by: 'x', type: 'bug',
  project_name: 'TrackLines', board_id: 'b', board_name: 'Backend', column_name: 'To do', done: false, snippet: '', ...extra,
}) as TicketSearchResult;
const results = (props: Partial<Parameters<typeof SearchResults>[0]>) =>
  renderToStaticMarkup(<SearchResults results={[]} loading={false} error="" active={0} onChoose={() => {}} onActive={() => {}} {...props} />);

test('results show where each ticket lives, with the active one selected', () => {
  const html = results({ results: [r('1', { snippet: '…login fails…', priority: 'urgent' }), r('2', { board_name: null, column_name: null })], active: 1 });
  for (const s of ['TL-1', 'Ticket 1', '…login fails…', 'TrackLines · Backend · To do', 'TrackLines · Backlog', 'Urgent', 'Copy ticket key TL-2']) expect(html).toContain(s);
  expect(html).toMatch(/id="search-result-2"[^>]*aria-selected="true"/);
  expect(html).toMatch(/id="search-result-1"[^>]*aria-selected="false"/);
});

test('error, searching and nothing found', () => {
  expect(results({ error: 'Couldn’t search tickets.' })).toContain('role="alert"');
  expect(results({ loading: true })).toContain('Searching…');
  expect(results({})).toContain('No tickets match this search.');
});

test('the assignee filter offers people and agents, not me (that is "Assigned to me") and not service keys', () => {
  expect(assigneeChoices([{ id: 'me', label: 'You', kind: 'person' }, { id: 'u2', label: 'Bo', kind: 'person' }, { id: 'Claude', label: 'Claude', kind: 'ai' }, { id: 'Bugfixes', label: 'Bugfixes', kind: 'service' }], 'me')
    .map((p) => p.id)).toEqual(['u2', 'Claude']);
});
