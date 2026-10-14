import { expect, test } from 'bun:test';
import { HashIcon } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsCard } from './settings-card';

test('a settings panel: icon, title and description; a link card is wholly the link', () => {
  const html = renderToStaticMarkup(<SettingsCard icon={HashIcon} title="Ticket keys" description="Keys start with this." href="/x" />);
  expect(html).toContain('Ticket keys');
  expect(html).toContain('Keys start with this.');
  expect(html).toContain('href="/x"');
  expect(html).not.toContain('col-span');
});

test('a wide panel (a form or a list) takes the whole row and lays its content out as a block (TL-282)', () => {
  const html = renderToStaticMarkup(<SettingsCard wide icon={HashIcon} title="Repositories" description="d"><p>list</p></SettingsCard>);
  expect(html).toContain('lg:col-span-3');
  expect(html).toContain('grid gap-3');
  expect(html).not.toContain('flex-wrap items-center gap-2');
});
