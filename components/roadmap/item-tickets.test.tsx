import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { ItemTickets, localProgress, progressLabel } from './item-tickets';
import { i18nFor } from '@/lib/i18n';

test('progress reads naturally', () => {
  expect(progressLabel(i18nFor('en'), 0, 0)).toBe('No tickets linked yet');
  expect(progressLabel(i18nFor('en'), 1, 1)).toBe('1 of 1 ticket done');
  expect(progressLabel(i18nFor('en'), 2, 5)).toBe('2 of 5 tickets done');
});

test('linked tickets show with progress', () => {
  const html = renderToStaticMarkup(
    <ItemTickets roadmapId="r" itemId="i" projectId="p" token="t"
      initial={[{ id: 'a', title: 'schema', done: true }, { id: 'b', title: 'api', done: false }]} />,
  );
  expect(html).toContain('1 of 2 tickets done');
  expect(html).toContain('aria-valuenow="1"');
  expect(html).toContain('href="/tickets/a"');
  expect(html).toContain('Unlink api');
});

test('a linked epic shows as an epic, and progress is the server’s: its sub-tickets count (TL-216)', () => {
  const html = renderToStaticMarkup(
    <ItemTickets roadmapId="r" itemId="i" projectId="p" token="t" progress={{ done: 3, total: 7 }}
      initial={[{ id: 'e', title: 'Checkout', done: false, type: 'epic' }, { id: 'b', title: 'api', done: true }]} />,
  );
  expect(html).toContain('3 of 7 tickets done'); // the epic's sub-tickets plus api, as the server counted them
  expect(html).toContain('>epic<');
  expect(html).toContain('A linked epic counts its sub-tickets, including ones added later');
  expect(html).toContain('Link a ticket or epic');
});

test('before the server’s figure, progress counts only plain tickets', () => {
  expect(localProgress([{ id: 'e', title: 'E', done: true, type: 'epic' }, { id: 'a', title: 'a', done: true }, { id: 'b', title: 'b', done: false }]))
    .toEqual({ done: 1, total: 2 });
});
