import { afterEach, expect, test } from 'bun:test';
import { api, sprints, tickets } from './api';

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

test('browser calls send the user’s timezone for day-based rules', async () => {
  g.window = { Clerk: { session: null } };
  let zone: string | undefined;
  g.fetch = (async (_url: string, init: RequestInit) => {
    zone = (init.headers as Record<string, string>)['Tracklines-Timezone'];
    return Response.json({});
  }) as unknown as typeof fetch;
  await api('/x');
  expect(zone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
});

test('a move sends an estimate only when sizing the ticket on the way in', async () => {
  g.window = { Clerk: { session: null } };
  const bodies: unknown[] = [];
  g.fetch = (async (_url: string, init: RequestInit) => { bodies.push(JSON.parse(String(init.body))); return new Response(null, { status: 204 }); }) as unknown as typeof fetch;
  await tickets.move('t1', 'c1', 0, null);
  await tickets.move('t1', 'c1', 2, null, '5');
  expect(bodies).toEqual([{ column_id: 'c1', position: 0 }, { column_id: 'c1', position: 2, estimate: '5' }]);
});

test('sprint controls send updated length and next sprint schedule', async () => {
  const requests: { method: string; body: unknown }[] = [];
  g.fetch = (async (_url: string, init: RequestInit) => {
    requests.push({ method: init.method ?? 'GET', body: JSON.parse(String(init.body)) });
    return Response.json({});
  }) as unknown as typeof fetch;

  await sprints.updateLength('sprint-1', 10, 'token');
  await sprints.close('sprint-1', 'token', { next_length_days: 7, next_starts_at: '2026-11-01T00:00:00.000Z' });

  expect(requests).toEqual([
    { method: 'PATCH', body: { length_days: 10 } },
    { method: 'POST', body: { next_length_days: 7, next_starts_at: '2026-11-01T00:00:00.000Z' } },
  ]);
});
