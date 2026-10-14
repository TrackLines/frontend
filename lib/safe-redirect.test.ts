import { expect, test } from 'bun:test';
import { safeRedirect } from './safe-redirect';

test('only same-site paths survive', () => {
  expect(safeRedirect('/boards/1?ticket=2#c')).toBe('/boards/1?ticket=2#c');
  for (const bad of ['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', 'javascript:alert(1)', '', undefined, ['/a'],
    '/.//evil.com', '/%2e//evil.com', '/a/..//evil.com']) { // these normalise to //evil.com (TL-252)
    expect(safeRedirect(bad as string)).toBe('/dashboard');
  }
});
