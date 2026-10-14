import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { Ticket, TicketSearchResult } from '@/lib/api';

mockDialog();
const { SimilarTickets, TicketDialog } = await import('./ticket-dialog');
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

test('similar tickets show while the title is typed, and go once the details are being written', () => {
  const similar = [{ id: 't1', key: 'TL-12', title: 'Login fails on Safari', project_name: 'TrackLines' } as TicketSearchResult];
  const shown = renderToStaticMarkup(<SimilarTickets suggestions={similar} description="" />);
  expect(shown).toContain('Similar tickets in this project');
  expect(shown).toContain('Login fails on Safari');
  expect(renderToStaticMarkup(<SimilarTickets suggestions={similar} description="  " />)).toContain('Login fails on Safari'); // spaces aren't details
  expect(renderToStaticMarkup(<SimilarTickets suggestions={similar} description="It happens after" />)).toBe('');
  expect(renderToStaticMarkup(<SimilarTickets suggestions={[]} description="" />)).toBe('');
});

test('a title searches for similar tickets from its first real word (TL-274)', () => {
  const { similarQuery } = require('./ticket-dialog');
  expect(similarQuery('Pagination')).toBe('Pagination'); // one word is enough
  expect(similarQuery('UI tweak')).toBe('tweak');
  expect(similarQuery('Login broken on Safari mobile and desktop')).toBe('Login broken Safari mobile and');
  for (const tooShort of ['', '   ', 'UI', 'a b', 'fix']) expect(similarQuery(tooShort)).toBeNull();
});
