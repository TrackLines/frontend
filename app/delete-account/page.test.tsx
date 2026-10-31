import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import DeleteAccountPage from './page';
import { PRIVACY } from '@/lib/legal/privacy';
import { isProtectedPath } from '@/proxy';

const html = renderToStaticMarkup(<DeleteAccountPage />);

test('it says what Google Play asks for: the app, the steps, and what is erased and kept', () => {
  expect(html).toContain('Delete your TrackLines account');
  expect(html).toContain('Delete account');
  expect(html).toContain('href="/contact"');
  expect(html).toContain('What we erase');
  expect(html).toContain('What we keep');
  expect(html).toContain('stays with your organization');
});

test('anyone can open it without signing in', () => {
  expect(isProtectedPath('/delete-account')).toBe(false);
});

test('what it says it erases matches the privacy policy', () => {
  for (const phrase of ['name, email address and language', 'device notification subscriptions', 'no longer shows your name', 'one-way hash']) {
    expect(PRIVACY).toContain(phrase);
    expect(html).toContain(phrase);
  }
});
