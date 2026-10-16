import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { isTicketKey, TicketKey, ticketPath, linkTitle } from './ticket-key';

test('ticket key is readable and has an accessible copy action when requested', () => {
  const html = renderToStaticMarkup(<TicketKey value="TL-123" copy />);
  expect(html).toContain('TL-123');
  expect(html).toContain('Copy ticket key TL-123');
});

test('ticket links use the id, never the key: keys repeat across organizations (TL-276)', () => {
  const ticket = { id: 'uuid-1', key: 'TL-123' };
  expect(ticketPath(ticket)).toBe('/tickets/uuid-1');
});

test('ticket keys accept the project key format without matching UUIDs', () => {
  expect(isTicketKey('TL-123')).toBe(true);
  expect(isTicketKey('trk-42')).toBe(true);
  expect(isTicketKey('not-a-ticket')).toBe(false);
});

test('a short link is named by the ticket key, never its title: anyone can look a short link up (TL-277)', () => {
  const ticket = { key: 'TL-204', title: 'Acquire Acme Ltd (confidential)' };
  expect(linkTitle(ticket)).toBe('TL-204 on TrackLin.es');
  expect(linkTitle(ticket)).not.toContain('Acme');
  expect(linkTitle({ key: null })).toBe('A ticket on TrackLin.es');
});
