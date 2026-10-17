import { afterEach, expect, test } from 'bun:test';
import { push } from './api';
import { keyBytes, pushSupported } from './push';

test('the VAPID key (base64url) becomes the bytes PushManager wants', () => {
  // "hello?" in base64url is aGVsbG8_ (no padding, - and _ for + and /)
  expect(Array.from(keyBytes('aGVsbG8_'))).toEqual([104, 101, 108, 108, 111, 63]);
  expect(keyBytes('BPub').length).toBe(3);
});

test('no browser (server render, tests): push is unsupported, never throws', () => {
  expect(pushSupported()).toBe(false);
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('subscribe sends the browser subscription; unsubscribe sends its endpoint', async () => {
  const calls: { method?: string; body: unknown }[] = [];
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    calls.push({ method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: 'BNcR', auth: 'tBHI' } };
  await push.subscribe(sub, 'tok');
  await push.unsubscribe(sub.endpoint, 'tok');
  expect(calls).toEqual([{ method: 'POST', body: sub }, { method: 'DELETE', body: { endpoint: sub.endpoint } }]);
});

test('a failed Turn on says why instead of doing nothing (TL-393)', async () => {
  const { pushFailure } = await import('./push');
  const named = (name: string, message: string) => Object.assign(new Error(message), { name });
  // plain Chromium (e.g. on Linux) has no push service: subscribe() rejects like this
  expect(pushFailure(named('AbortError', 'Registration failed - push service error'))).toContain('no push service to deliver them');
  expect(pushFailure(named('NotAllowedError', 'Permission denied'))).toContain('blocked for this site');
  expect(pushFailure(new Error('500'))).toBe('Couldn’t change notifications on this device. Please try again.');
});

test('the card and the bell show that reason', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { DevicePushView } = await import('@/components/settings/device-push');
  const { PushControl } = await import('@/components/notifications-bell');
  const why = 'this browser has no push service';
  expect(renderToStaticMarkup(<DevicePushView state="off" busy={false} error={why} onToggle={() => {}} />)).toContain(`role="alert"`);
  expect(renderToStaticMarkup(<DevicePushView state="off" busy={false} error={why} onToggle={() => {}} />)).toContain(why);
  expect(renderToStaticMarkup(<PushControl state="off" busy={false} error={why} onToggle={() => {}} />)).toContain(why);
  expect(renderToStaticMarkup(<PushControl state="off" busy={false} onToggle={() => {}} />)).not.toContain('role="alert"');
});
