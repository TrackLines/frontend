import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { Ticket } from '@/lib/api';

mockDialog();
const { Assignee, TicketView } = await import('./ticket-view');
const { renderToStaticMarkup } = await import('react-dom/server');

const ticket: Ticket = {
  id: 't1', key: 'TL-7', column_id: 'c', position: 0, title: 'Fix login', description: '**Steps**\n\n- open it', created_by: 'Sam',
  assigned_to: 'claude', estimate: '3', labels: ['auth', 'ui'], created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z',
};
const view = (props: Partial<Parameters<typeof TicketView>[0]> = {}) =>
  renderToStaticMarkup(<TicketView open onOpenChange={() => {}} ticket={ticket} columnName="In progress" {...props} />);

test('shows the ticket: key, title, status, estimate, people, labels and rendered details', () => {
  const html = view();
  for (const s of ['TL-7', 'Fix login', 'In progress', 'Sam', 'claude', 'auth', 'ui', '<strong>Steps</strong>', '<li>open it</li>', 'Updated']) expect(html).toContain(s);
  expect(view({ open: false })).toBe('');
});

test('empty details and no assignee read plainly', () => {
  const html = view({ ticket: { ...ticket, description: '', assigned_to: null } });
  expect(html).toContain('No details provided.');
  expect(html).toContain('Unassigned');
});

test('Edit only when it can be edited; Close always; the copy link unless it is a sample', () => {
  expect(view()).not.toContain('>Edit<');
  expect(view({ onEdit: () => {} })).toContain('>Edit<');
  expect(view()).toContain('>Close<');
  expect(view()).toContain('Copy link');
  const sample = view({ sample: <p>sample sections</p> });
  expect(sample).toContain('sample sections');
  expect(sample).not.toContain('Copy link');
});

test('review actions only for a ticket waiting on review, with a token and a handler', () => {
  const waiting = { ...ticket, review_requested_at: '2026-10-03T10:00:00Z' };
  expect(view({ ticket: waiting })).toContain('Needs review');
  expect(view({ ticket: waiting })).not.toContain('Approve');
  expect(view({ ticket: waiting, token: 'tok', onReviewed: () => {} })).toContain('Approve');
  expect(view({ token: 'tok', onReviewed: () => {} })).not.toContain('Approve');
});

test('a duplicate links to its original; a done ticket shows when', () => {
  const dup = view({ ticket: { ...ticket, duplicate_of_id: 'o1', duplicate_of_key: 'TL-2', duplicate_of_title: 'Original' } });
  expect(dup).toContain('Duplicate of TL-2');
  expect(dup).toContain('href="/tickets/o1"');
  expect(view({ ticket: { ...ticket, done_at: '2026-10-04T10:00:00Z' } })).toContain('>Done<');
});

test('the view is as wide as the edit dialog', async () => {
  const { TICKET_DIALOG_WIDTH } = await import('./ticket-dialog');
  expect(view()).toContain(TICKET_DIALOG_WIDTH);
});

test('the assignee says when they’re on holiday, like the ticket page’s picker (TL-436)', () => {
  const people = [
    { id: 'user_me', label: 'You', kind: 'person' as const, away: { until: '2099-10-24T00:00:00Z' } },
    { id: 'user_sam', label: 'Sam', kind: 'person' as const },
  ];
  const away = renderToStaticMarkup(<Assignee id="user_me" people={people} />);
  expect(away).toContain('You');
  expect(away).toContain('on holiday until');
  expect(renderToStaticMarkup(<Assignee id="user_sam" people={people} />)).toBe('Sam');
});
