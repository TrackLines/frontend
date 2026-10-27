import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { StaffGate } from './staff-shell';
import { askStaff, forgetStaff } from '@/lib/hooks/use-staff';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; forgetStaff(); });

test('staff see the panel with a tab per page; everyone else gets the not-found page (TL-577)', () => {
  const html = render(<StaffGate staff tab="help"><p>inside</p></StaffGate>);
  for (const s of ['Admin panel', 'href="/staff/stats"', 'href="/staff/downtime"', '<p>inside</p>']) expect(html).toContain(s);
  expect(html).toMatch(/aria-current="page"[^>]*href="\/staff\/help"/);
  expect(render(<StaffGate staff={undefined} tab="stats"><p>inside</p></StaffGate>)).not.toContain('inside');
  expect(() => render(<StaffGate staff={false} tab="stats"><p>inside</p></StaffGate>)).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
});

test('the backend decides who is staff, asked once a visit: a 404 is no', async () => {
  let asked = 0;
  globalThis.fetch = (async () => { asked++; return new Response('not found', { status: 404 }); }) as unknown as typeof fetch;
  expect(await askStaff('t')).toBe(false);
  expect(await askStaff('t')).toBe(false);
  expect(asked).toBe(1);
  forgetStaff();
  globalThis.fetch = (async (url: string) => { asked++; expect(String(url)).toEndWith('/staff/me'); return Response.json({ staff: true }); }) as unknown as typeof fetch;
  expect(await askStaff('t')).toBe(true);
});

test('the user menu offers the admin panel to staff only (source)', async () => {
  const menu = await Bun.file(new URL('../layout/user-menu.tsx', import.meta.url)).text();
  expect(menu).toContain("{staff && <UserButton.Action label={t`Admin panel`}");
  expect(menu).toContain("router.push('/staff')");
});
