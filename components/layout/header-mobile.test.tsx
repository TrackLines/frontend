import { expect, mock, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';

// module mocks reach every test file: keep the rest of each module real
const nav = await import('next/navigation');
const clerk = await import('@clerk/nextjs');
mock.module('next/navigation', () => ({ ...nav, usePathname: () => '/dashboard', useRouter: () => ({ push() {}, replace() {}, prefetch() {} }) }));
mock.module('@clerk/nextjs', () => ({ ...clerk, useAuth: () => ({ getToken: async () => 'tok', isSignedIn: true, userId: 'u1' }) }));
const { QuickAddTicket } = await import('../ticket/quick-add-ticket');
const { TicketSearch } = await import('../ticket/ticket-search');

// TL-471: on a phone the header's buttons are icons, so the logo, buttons, bell, theme and avatar fit;
// from the sm breakpoint up they read as before. Their names stay for screen readers either way.
test('the header buttons are icons on phones and keep their names', () => {
  const add = renderToStaticMarkup(<QuickAddTicket />);
  expect(add).toContain('aria-label="New ticket"');
  expect(add).toContain('<svg'); // the + icon
  expect(add).toContain('<span class="hidden sm:inline">New ticket</span>');

  const search = renderToStaticMarkup(<TicketSearch />);
  expect(search).toContain('aria-label="Search tickets (Ctrl+K)"');
  expect(search).toMatch(/<svg[^>]*class="[^"]*sm:hidden/); // the magnifier, phones only
  expect(search).toContain('<span class="hidden sm:inline">Search</span>');
  expect(search).toMatch(/<kbd class="[^"]*hidden[^"]*sm:inline/); // no ⌘K on a phone
});

test('the header itself: 16px gutters on phones, the name beside the logo from sm up', async () => {
  const layout = await Bun.file(new URL('../../app/layout.tsx', import.meta.url)).text();
  expect(layout).toContain('px-4 sm:px-6 py-4');
  expect(layout).toContain('aria-label="TrackLin.es"');
  expect(layout).toContain('<span className="hidden sm:inline">TrackLin.es</span>');
  expect(layout).toContain('gap-1.5 sm:gap-4');
});
