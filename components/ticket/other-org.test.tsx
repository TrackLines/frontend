import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { ElsewhereView } from './other-org';

test('a ticket in another of your organizations says which, and offers to switch (TL-276)', () => {
  const html = renderToStaticMarkup(<ElsewhereView orgName="ChewedFeed" switching={false} onSwitch={() => {}} />);
  expect(html).toContain('This ticket is in ChewedFeed');
  expect(html).toContain('>Switch to ChewedFeed<');
  expect(html).not.toContain('not found');
  expect(renderToStaticMarkup(<ElsewhereView orgName="ChewedFeed" switching onSwitch={() => {}} />)).toContain('Switching…');
});
