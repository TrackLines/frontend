import { afterEach, expect, test } from 'bun:test';
import { api } from './api';

const g = globalThis as unknown as { window?: unknown; fetch: typeof fetch };
const realFetch = g.fetch;
afterEach(() => { delete g.window; g.fetch = realFetch; });

// Browser: the token callers pass may be stale, so api() asks Clerk at request time and retries a 401 once uncached.
test('uses a live Clerk token and retries a 401 with a fresh one', async () => {
  const asked: (boolean | undefined)[] = [];
  g.window = { Clerk: { session: { getToken: async (o?: { skipCache?: boolean }) => { asked.push(o?.skipCache); return o?.skipCache ? 'fresh' : 'cached'; } } } };
  const sent: (string | null)[] = [];
  g.fetch = (async (_url: string, init: RequestInit) => {
    const auth = (init.headers as Record<string, string>).Authorization ?? null;
    sent.push(auth);
    return auth === 'Bearer fresh' ? Response.json({ ok: true }) : new Response('unauthorized', { status: 401 });
  }) as unknown as typeof fetch;

  expect(await api<{ ok: boolean }>('/x', { method: 'POST', body: {}, token: 'stale' })).toEqual({ ok: true });
  expect(sent).toEqual(['Bearer cached', 'Bearer fresh']);
  expect(asked).toEqual([false, true]);
});

test('signed-out calls send no token and are not retried', async () => {
  g.window = { Clerk: { session: null } };
  let calls = 0;
  g.fetch = (async () => { calls++; return new Response('unauthorized', { status: 401 }); }) as unknown as typeof fetch;
  await expect(api('/x')).rejects.toThrow();
  expect(calls).toBe(1);
});
