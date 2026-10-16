import { expect, test } from 'bun:test';

// the brand in the header: the logo, and the name written TrackLin.es
test('the header shows the logo beside TrackLin.es', async () => {
  const src = await Bun.file(new URL('./layout.tsx', import.meta.url)).text();
  expect(src).toContain('src="/logo-tile.png"');
  expect(src).toMatch(/<Image [^>]*\/>\s*TrackLin\.es\s*<\/Link>/);
  expect(await Bun.file(new URL('../public/logo-tile.png', import.meta.url)).exists()).toBe(true);
});
