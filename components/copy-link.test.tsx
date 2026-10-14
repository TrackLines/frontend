import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopyButton } from './copy-link';

test('copy button is labelled for screen readers', () => {
  const html = renderToStaticMarkup(<CopyButton value="abc" label="Copy ID" ariaLabel="Copy project ID" />);
  expect(html).toContain('aria-label="Copy project ID"');
  expect(html).toContain('Copy ID');
});

test('Copy link gives a short link, made once; the full link when it can\'t be shortened (TL-277)', async () => {
  const { shortOr } = await import('./copy-link');
  let asked = 0;
  const make = async (url: string) => { asked++; return { url: `https://1tn.pw/abc${url.length}` }; };
  const full = 'https://tracklin.es/tickets/9205518f-7140-44cf-b155-4e9b8d6a2d48';
  const short = await shortOr(full, make);
  expect(short).toStartWith('https://1tn.pw/abc');
  expect(await shortOr(full, make)).toBe(short);
  expect(asked).toBe(1); // reused, not made again
  const other = 'https://tracklin.es/boards/b1';
  expect(await shortOr(other, null)).toBe(other); // signed out
  expect(await shortOr(other, async () => { throw new Error('502'); })).toBe(other); // shortener down
});
