import { expect, test } from 'bun:test';

// the brand in the header: the logo, and the name written TrackLin.es
test('the header shows the logo beside TrackLin.es', async () => {
  const src = await Bun.file(new URL('./layout.tsx', import.meta.url)).text();
  expect(src).toContain('src="/logo-tile.png"');
  // the name beside it from sm up; on phones just the logo, the link still named TrackLin.es (TL-471)
  expect(src).toMatch(/<Image [^>]*\/>\s*<span className="hidden sm:inline">TrackLin\.es<\/span>\s*<\/Link>/);
  expect(src).toContain('aria-label="TrackLin.es"');
  expect(await Bun.file(new URL('../public/logo-tile.png', import.meta.url)).exists()).toBe(true);
});
