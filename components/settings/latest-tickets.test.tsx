import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { LatestTicketsView } from './latest-tickets';

const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();

test('Latest tickets: how many (0–20) and per project (1–20), on Your settings', async () => {
  const html = renderToStaticMarkup(<LatestTicketsView initial={{ limit: 12, per_project: 2 }} onSave={async () => {}} />);
  for (const s of ['Latest tickets', 'value="12"', 'value="2"', 'min="0"', 'max="20"', 'min="1"', '>Save<']) expect(html).toContain(s);
  expect(await read('../../app/account/page.tsx')).toContain('<LatestTicketsCard ');
});
