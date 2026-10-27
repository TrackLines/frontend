import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SHOW_AFTER, ScrollToTop, shouldShow } from './scroll-to-top';

test('scroll to top shows only once you’ve scrolled down a long page, on every page (TL-412)', async () => {
  expect(shouldShow(0)).toBe(false);
  expect(shouldShow(SHOW_AFTER)).toBe(false);
  expect(shouldShow(SHOW_AFTER + 1)).toBe(true);
  expect(renderToStaticMarkup(<ScrollToTop />)).toBe(''); // hidden until scrolled
  const layout = await Bun.file(new URL('../../app/layout.tsx', import.meta.url)).text();
  expect(layout).toContain('<ScrollToTop />'); // platform-wide: in the root layout
});
