import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { When } from './when';

test('relative text, machine-readable UTC, exact local time on hover', () => {
  const iso = new Date(Date.now() - 3 * 3600e3).toISOString();
  const html = renderToStaticMarkup(<When iso={iso} />);
  expect(html).toContain(`dateTime="${iso}"`);
  expect(html).toContain('>3 hours ago<');
  expect(html).toContain(`title="${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))}"`);
});
