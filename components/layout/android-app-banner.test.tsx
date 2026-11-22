import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { AndroidAppBanner, isAndroidBrowser } from './android-app-banner';

test('the Android app banner shows in Android browsers only, on every page', async () => {
  expect(isAndroidBrowser('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36')).toBe(true);
  expect(isAndroidBrowser('Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36')).toBe(false); // in-app web view
  expect(isAndroidBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe(false);
  expect(isAndroidBrowser('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36')).toBe(false);
  expect(renderToStaticMarkup(<AndroidAppBanner />)).toBe(''); // decided on the client: nothing server-rendered
  const layout = await Bun.file(new URL('../../app/layout.tsx', import.meta.url)).text();
  expect(layout).toContain('<AndroidAppBanner />');
});
