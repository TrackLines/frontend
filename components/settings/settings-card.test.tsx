import { expect, test } from 'bun:test';
import { HashIcon } from 'lucide-react';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { SettingsCard } from './settings-card';

test('a settings panel: icon, title and description; a link card is wholly the link', () => {
  const html = renderToStaticMarkup(<SettingsCard icon={HashIcon} title="Ticket keys" description="Keys start with this." href="/x" />);
  expect(html).toContain('Ticket keys');
  expect(html).toContain('Keys start with this.');
  expect(html).toContain('href="/x"');
  expect(html).toContain('aria-label="Ticket keys"');
  expect(html).not.toContain('col-span');
});

test('a link card can hold its own links and buttons, above the card link (API keys)', () => {
  const html = renderToStaticMarkup(<SettingsCard icon={HashIcon} title="API keys" href="/settings/api-keys"
    description={<>Yours are in <a href="/account/api-keys" className="relative z-10">Your settings</a>.</>}><button type="button">Connect AI</button></SettingsCard>);
  expect(html).toContain('href="/settings/api-keys"');
  expect(html).toContain('href="/account/api-keys"');
  expect(html).not.toMatch(/<a[^>]*>[^]*<a[^>]*>[^]*<\/a>[^]*<\/a>/); // no link inside a link
  expect(html).toContain('relative z-10'); // the card's own actions sit above the card link
  expect(html).toContain('Connect AI');
});

test('a wide panel (a form or a list) takes the whole row and lays its content out as a block (TL-282)', () => {
  const html = renderToStaticMarkup(<SettingsCard wide icon={HashIcon} title="Repositories" description="d"><p>list</p></SettingsCard>);
  expect(html).toContain('lg:col-span-3');
  expect(html).toContain('grid gap-3');
  expect(html).not.toContain('flex-wrap items-center gap-2');
});
