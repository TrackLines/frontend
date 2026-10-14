import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { isTicketKey, TicketKey, ticketPath } from './ticket-key';

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
