import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { Ticket } from '@/lib/api';

mockDialog();
const { TicketDialog } = await import('./ticket-dialog');
const { renderToStaticMarkup } = await import('react-dom/server');

const ticket: Ticket = { id: 't1', key: 'TL-7', column_id: 'c', position: 0, title: 'Fix login', description: 'details', created_by: 'Sam', project_id: 'p', type: 'bug' };
const dialog = (props: Partial<Parameters<typeof TicketDialog>[0]> = {}) =>
  renderToStaticMarkup(<TicketDialog open onOpenChange={() => {}} token="tok" projectId="p" columnId="c" onSaved={() => {}} {...props} />);

test('adding: an empty form, files can come along, no assignee or delete', () => {
  const html = dialog();
  expect(html).toContain('Add a ticket');
  expect(html).toContain('>Add ticket<');
  expect(html).toContain('Attachments');
  for (const never of ['Edit ticket', 'Assignee', '>Delete<', 'Won&#x27;t do', 'Send to backlog']) expect(html).not.toContain(never);
});

test('editing: the ticket filled in, with its key, assignee and save', () => {
  const html = dialog({ ticket });
  for (const s of ['Edit ticket', 'TL-7', 'value="Fix login"', '>details</textarea>', 'Assignee', '>Save changes<']) expect(html).toContain(s);
});

test('delete, won’t do and send to backlog are offered only when the caller handles them', () => {
  expect(dialog({ ticket })).not.toContain('>Delete<');
  expect(dialog({ ticket, onDeleted: () => {} })).toContain('>Delete<');
  expect(dialog({ ticket, onWontDo: () => {} })).toContain('Won&#x27;t do');
  expect(dialog({ ticket, onSentToBacklog: () => {} })).toContain('Send to backlog');
});

test('an estimate is asked for only on boards with a scale', () => {
  expect(dialog()).not.toContain('Estimate');
  expect(dialog({ scale: 'fibonacci' })).toContain('Estimate');
});

test('details take @mentions', () => {
  expect(dialog({ ticket })).toContain('aria-autocomplete="list"');
});

test('a backlog ticket can be moved to a board from its edit dialog, when the caller allows it (TL-464)', () => {
  const board = { id: 'b1', project_id: 'p', owner_clerk_id: 'o', name: 'Team', description: '', created_at: '', updated_at: '' };
  expect(dialog({ ticket })).not.toContain('Move to board');
  expect(dialog({ ticket, move: { boards: [], onMoved: () => {} } })).not.toContain('Move to board'); // nowhere to go
  expect(dialog({ ticket, move: { boards: [board], onMoved: () => {} } })).toContain('Move to board…');
});
