import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

mock.module('next/headers', () => ({
  headers: async () => new Headers({ 'x-nonce': 'n0nce' }),
  cookies: async () => ({ get: () => undefined }),
}));
mock.module('next/font/google', () => ({ Geist: () => ({ variable: 'geist-var' }) }));

// TL-585: the 404 skips the root layout (TL-298), so it brings its own theme and font.
test('the 404 follows the chosen theme, with the CSP nonce, and the app’s font', async () => {
  const { default: GlobalNotFound } = await import('./global-not-found');
  const html = renderToStaticMarkup(await GlobalNotFound());
  expect(html).toContain('tracklines-theme'); // next-themes' script reads the saved choice
  expect(html).toContain('nonce="n0nce"');
  expect(html).toContain('geist-var');
  expect(html).toContain('This page doesn’t exist');
  expect(html).toContain('lang="en"');
});
