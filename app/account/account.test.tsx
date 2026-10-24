import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { DevicePushView } from '@/components/settings/device-push';

const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();

// Your settings (TL-294): personal notification settings get their own page, away from the org's
test('Google Chat lives on Your settings, not the organization’s Settings', async () => {
  expect(await read('./page.tsx')).toContain('<ChatDmCard ');
  expect(await read('./page.tsx')).toContain('<DevicePushCard ');
  expect(await read('../settings/page.tsx')).not.toContain('ChatDmCard');
});

test('Your settings is reachable from the account menu and the bell, and needs sign-in', async () => {
  const menu = await read('../../components/user-menu.tsx');
  expect(menu).toContain('label={t`Your settings`}');
  expect(menu).toContain("router.push('/account')");
  expect(menu).toContain('label={t`Organization settings`}');
  expect(await read('../../components/notifications-bell.tsx')).toContain('href="/account"');
  expect(await read('../../proxy.ts')).toContain("'/account'");
});

test('this device: on, off, or blocked; hidden when there’s nothing you can do (TL-392)', () => {
  const view = (state: Parameters<typeof DevicePushView>[0]['state']) => renderToStaticMarkup(<DevicePushView state={state} busy={false} onToggle={() => {}} />);
  expect(view('on')).toContain('>Turn off<');
  expect(view('off')).toContain('>Turn on<');
  expect(view('blocked')).toContain('blocked for this site');
  expect(view('blocked')).not.toContain('Turn on');
  expect(view('unavailable')).toBe(''); // the server doesn't send them: not yours to fix
  expect(view('unsupported')).toBe(''); // this browser can't (also the state while it checks)
});
