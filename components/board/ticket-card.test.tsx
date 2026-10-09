import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketCard } from './ticket-card';

const base = { id: 't', column_id: 'c', title: 'Integrate uploadthing', description: 'long details', position: 0, created_by: 'user_3KHx3OAKtUhUZu3lJ0VyM6725bk' };
const card = (extra: object) => renderToStaticMarkup(<TicketCard ticket={{ ...base, ...extra }} token="x" onUpdated={() => {}} onDeleted={() => {}} />);

test('clean card: readable people, only meaningful badges, compact actions', () => {
  const html = card({ type: 'feature', priority: 'urgent', assigned_to: 'claude' });
  expect(html).not.toContain('user_3KHx');
  expect(html).toContain('by You');
  expect(html).toContain('>claude<');
  expect(html).toContain('>Urgent<');
  expect(html).toContain('>feature<');
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
