import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardWorkView } from './dashboard-work';
import type { Mention, TicketSearchResult } from '@/lib/api';

const mine = { id: 't1', key: 'TL-12', title: 'Fix login', column_id: 'c', position: 0, description: '', created_by: 'x', priority: 'urgent', blocked: true,
  project_name: 'TrackLines', board_id: 'b', board_name: 'Backend', column_name: 'In progress', done: false, snippet: '' } as TicketSearchResult;
const mention: Mention = { ticket_id: 't2', key: 'TL-40', title: 'Old bug', done: true, project_name: 'TrackLines', actor: 'user_bo', comment_id: 'c1', mentioned_at: new Date().toISOString() };

test('my assigned tickets and the tickets that mention me', () => {
  const html = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} mentioned={[mention, { ...mention, ticket_id: 't3', key: 'TL-41', actor: 'Codex', done: false }]}
    people={[{ id: 'user_bo', label: 'Bo Jones', kind: 'person' }]} />);
  for (const s of ['Assigned to me', 'href="/my-work"', 'TL-12', 'href="/tickets/t1"', 'Fix login', 'Urgent', 'Blocked', 'In progress',
    'Mentions', 'href="/mentions"', 'TL-40', 'href="/tickets/t2"', 'Bo Jones', 'Codex', 'line-through']) expect(html).toContain(s);
});

test('loading, empty and failed', () => {
  expect(renderToStaticMarkup(<DashboardWorkView assigned={null} mentioned={null} people={[]} />)).toContain('Loading…');
  const empty = renderToStaticMarkup(<DashboardWorkView assigned={[]} mentioned={[]} people={[]} />);
  expect(empty).toContain('Nothing assigned to you right now.');
  expect(empty).toContain('Nobody has mentioned you yet.');
  expect(renderToStaticMarkup(<DashboardWorkView assigned="failed" mentioned={[]} people={[]} />)).toContain('role="alert"');
});
