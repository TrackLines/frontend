import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketCard } from './ticket-card';

const base = { id: 't', column_id: 'c', title: 'Integrate uploadthing', description: 'long details', position: 0, created_by: 'user_3KHx3OAKtUhUZu3lJ0VyM6725bk' };
const card = (extra: object) => renderToStaticMarkup(<TicketCard ticket={{ ...base, ...extra }} token="x" onUpdated={() => {}} onDeleted={() => {}} />);

test('clean card: readable people, only meaningful badges, compact actions', () => {
  const html = card({ key: 'TL-123', type: 'feature', priority: 'urgent', assigned_to: 'claude' });
  expect(html).not.toContain('user_3KHx');
  expect(html).toContain('by A teammate'); // a person, before the org's people list loads: never assumed to be "You" (TL-229)
  expect(html).toContain('>claude<');
  expect(html).toContain('>Urgent<');
  expect(html).toContain('>feature<');
  expect(html).toContain('TL-123');
  expect(html).toContain('aria-label="Edit Integrate uploadthing"');
  expect(html).not.toContain('>View<');
  expect(html).not.toContain('Edit ticket');
});

test('defaults stay quiet', () => {
  const html = card({ type: 'task', priority: 'medium', assigned_to: null });
  expect(html).not.toContain('data-slot="badge"');
  expect(html).toContain('Unassigned');
});

test('blocked tickets say so', () => {
  expect(card({ type: 'task', priority: 'medium', blocked: true })).toContain('Blocked');
  expect(card({ type: 'task', priority: 'medium', blocked: false })).not.toContain('Blocked');
});

test('estimate shows as a badge, even on an otherwise plain task', () => {
  expect(card({ estimate: '8' })).toContain('aria-label="Estimate 8"');
  expect(card({ estimate: null })).not.toContain('Estimate');
});

test('card says how old the ticket is', () => {
  expect(card({ created_at: new Date(Date.now() - 2 * 86400e3).toISOString() })).toContain('2 days ago');
});

test('while the board is being edited, cards are view only', () => {
  const html = renderToStaticMarkup(<TicketCard ticket={{ ...base, type: 'task' }} token="x" onUpdated={() => {}} onDeleted={() => {}} readOnly />);
  expect(html).toContain('Integrate uploadthing'); // still readable
  expect(html).not.toContain('aria-label="Edit Integrate uploadthing"');
});

test('tickets Bugfixes made are marked', () => {
  expect(card({ type: 'bug', external_source: 'bugfixes' })).toContain('>Bugfixes<');
  expect(card({ type: 'bug' })).not.toContain('>Bugfixes<');
});

test('the key sits on its own line above the title and never wraps', () => {
  const html = card({ key: 'TL-113', title: 'PR webhooks: link PRs to tickets, merge closes the ticket', type: 'feature' });
  expect(html).toContain('whitespace-nowrap');
  expect(html.indexOf('TL-113')).toBeLessThan(html.indexOf('PR webhooks'));
  // the title button holds only the title
  expect(html).toMatch(/<button[^>]*>PR webhooks: link PRs to tickets, merge closes the ticket<\/button>/);
});

test('TL-134 layout: key, type, priority, blocked, estimate and pencil on top; then title, labels, description, people', () => {
  const html = card({ key: 'TL-133', title: 'Project repositories on their own page', type: 'bug', priority: 'urgent', blocked: true, estimate: '1', labels: ['frontend'], assigned_to: 'Claude' });
  const at = (s: string) => html.indexOf(s);
  const order = ['TL-133', '>bug<', '>Urgent<', ' Blocked<', 'Estimate 1', 'Edit Project', '>Project repositories', '>frontend<', 'long details', 'by '].map(at);
  expect(order.every((i) => i >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(html).toContain('rounded-full'); // the estimate is a round badge
});

test('TL-517: the key links to the full ticket page by id; the title still opens the modal', () => {
  const html = card({ id: 'abc-123', key: 'TL-517', title: 'Open me' });
  expect(html).toMatch(/<a [^>]*href="\/tickets\/abc-123"[^>]*>.*TL-517.*<\/a>/);
  expect(html).toMatch(/<button[^>]*>Open me<\/button>/);
});
