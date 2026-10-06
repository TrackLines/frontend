import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ItemTickets, progressLabel } from './item-tickets';

test('progress reads naturally', () => {
  expect(progressLabel(0, 0)).toBe('No tickets linked yet');
  expect(progressLabel(1, 1)).toBe('1 of 1 ticket done');
  expect(progressLabel(2, 5)).toBe('2 of 5 tickets done');
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
