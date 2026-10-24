import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { Ticket } from '@/lib/api';

mockDialog();
const { TicketDialog } = await import('./ticket-dialog');
const { render: renderToStaticMarkup } = await import('@/test/i18n');

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

test('a ticket can be moved to a board from its edit dialog, from the backlog (TL-464) or another board (TL-381), when the caller allows it', () => {
  const board = { id: 'b1', project_id: 'p', owner_clerk_id: 'o', name: 'Team', description: '', created_at: '', updated_at: '' };
  expect(dialog({ ticket })).not.toContain('Move to board');
  expect(dialog({ ticket, move: { boards: [], onMoved: () => {} } })).not.toContain('Move to board'); // nowhere to go
  expect(dialog({ ticket, move: { boards: [board], onMoved: () => {} } })).toContain('Move to board…'); // on a board (columnId c)
  expect(dialog({ ticket, columnId: '', move: { boards: [board], onMoved: () => {} } })).toContain('Move to board…'); // in the backlog
});

test('moving to another board says which sub-tickets go with it (TL-381)', async () => {
  const { alsoMovesNote } = await import('./ticket-dialog');
  const { MoveToBoard } = await import('@/components/project/move-to-board');
  const { i18nFor } = await import('@/lib/i18n');
  const en = i18nFor('en');
  const subs = [{ id: 's1', key: 'TL-8', title: 'Part one' }, { id: 's2', key: 'TL-9', title: 'Part two' }];
  expect(alsoMovesNote(subs, en, 'board')).toBe('Moving it also moves its 2 open sub-tickets on this board: TL-8, TL-9.');
  expect(alsoMovesNote(subs.slice(0, 1), en, 'board')).toBe('Moving it also moves its open sub-ticket on this board: TL-8.');
  expect(alsoMovesNote(subs, en)).toContain('Sending it to the backlog'); // the backlog wording stays
  expect(alsoMovesNote([], en, 'board')).toBe('');
  const board = { id: 'b1', project_id: 'p', owner_clerk_id: 'o', name: 'Team', description: '', created_at: '', updated_at: '' };
  const html = renderToStaticMarkup(<MoveToBoard ticket={ticket} boards={[board]} token="tok" onMoved={() => {}} onCancel={() => {}} fromBoard alsoMoves={alsoMovesNote(subs, en, 'board')} />);
  expect(html).toContain('Moving it also moves its 2 open sub-tickets');
});

test('a spike’s timebox shows "3 days", not a raw "3" (TL-581)', () => {
  const html = dialog({ ticket: { ...ticket, type: 'spike', timebox_days: 3, timebox_hours: 1 } });
  expect(html).toMatch(/data-slot="select-value"[^>]*>3 days</);
  expect(html).toMatch(/data-slot="select-value"[^>]*>1 hour</);
});
