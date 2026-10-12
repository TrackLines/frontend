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
