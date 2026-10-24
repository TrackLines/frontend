import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { DashboardWorkView, SHOW, SHOW_CREATED } from './dashboard-work';
import type { Mention, TicketSearchResult } from '@/lib/api';

const mine = { id: 't1', key: 'TL-12', title: 'Fix login', column_id: 'c', position: 0, description: '', created_by: 'x', priority: 'urgent', blocked: true,
  project_name: 'TrackLines', board_id: 'b', board_name: 'Backend', column_name: 'In progress', done: false, snippet: '' } as TicketSearchResult;
const raised = { ...mine, id: 't9', key: 'TL-99', title: 'Idea I raised', blocked: false, priority: 'medium', column_name: null } as TicketSearchResult;
const mention: Mention = { ticket_id: 't2', key: 'TL-40', title: 'Old bug', done: true, project_name: 'TrackLines', actor: 'user_bo', comment_id: 'c1', mentioned_at: new Date().toISOString() };

test('my assigned tickets and the tickets that mention me', () => {
  const html = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} created={[]} mentioned={[mention, { ...mention, ticket_id: 't3', key: 'TL-41', actor: 'Codex', done: false }]}
    people={[{ id: 'user_bo', label: 'Bo Jones', kind: 'person' }]} />);
  for (const s of ['Assigned to me', 'href="/my-work"', 'TL-12', 'href="/tickets/t1"', 'Fix login', 'Urgent', 'Blocked', 'In progress',
    'Mentions', 'href="/mentions"', 'TL-40', 'href="/tickets/t2"', 'Bo Jones', 'Codex', 'line-through']) expect(html).toContain(s);
  expect(html).not.toContain('Created by me'); // no created tickets → no tab
});

test('the Created by me tab appears only once I have created a ticket', () => {
  const html = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} created={[raised]} mentioned={[]} people={[]} />);
  expect(html).toContain('Assigned to me');
  expect(html).toContain('Created by me');
  expect(html).toContain('TL-99');
  expect(html).toContain('Idea I raised');
});

test('empty sections are not shown (TL-490)', () => {
  // nothing assigned, nothing created, no mentions → nothing renders at all
  expect(renderToStaticMarkup(<DashboardWorkView assigned={[]} created={[]} mentioned={[]} people={[]} />)).toBe('');
  // mentions present but nothing assigned/created → only the Mentions card
  const onlyMentions = renderToStaticMarkup(<DashboardWorkView assigned={[]} created={[]} mentioned={[mention]} people={[]} />);
  expect(onlyMentions).toContain('Mentions');
  expect(onlyMentions).not.toContain('Assigned to me');
  // assigned present but no mentions → no Mentions card
  const onlyWork = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} created={[]} mentioned={[]} people={[]} />);
  expect(onlyWork).toContain('Assigned to me');
  expect(onlyWork).not.toContain('Mentions');
});

test('loading and failed keep the cards', () => {
  const loading = renderToStaticMarkup(<DashboardWorkView assigned={null} created={null} mentioned={null} people={[]} />);
  expect(loading).toContain('Loading…');
  expect(renderToStaticMarkup(<DashboardWorkView assigned="failed" created={[]} mentioned={[]} people={[]} />)).toContain('role="alert"');
});

test('a tab that shows only some of my tickets says how many there are, and links to them all (TL-548)', () => {
  const html = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} created={[raised]} mentioned={[]} people={[]} totals={{ assigned: 1, created: 9 }} />);
  expect(html).toContain('1 of 9 tickets');
  expect(html).toContain('href="/my-work?tab=created"');
  expect(html).not.toContain('1 of 1'); // assigned shows everything: no count
  const only = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} created={[]} mentioned={[]} people={[]} totals={{ assigned: 7 }} />);
  expect(only).toContain('1 of 7 tickets');
});

test('Created by me shows 4, so its footer takes the fifth row and the card keeps its height (TL-572)', () => {
  expect(SHOW).toBe(5);
  expect(SHOW_CREATED).toBe(4);
  const four = Array.from({ length: 4 }, (_, i) => ({ ...raised, id: `c${i}`, key: `TL-${i}` }));
  const html = renderToStaticMarkup(<DashboardWorkView assigned={[mine]} created={four} mentioned={[]} people={[]} totals={{ created: 9 }} />);
  expect(html).toContain('of 9 tickets');
});
