import { afterEach, expect, test } from 'bun:test';
import { api, backlog, projects, sprints, tickets } from './api';

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

test('backlog page sends repeatable priority filters with labels and type', async () => {
  let requested = '';
  g.fetch = (async (url: string) => { requested = url; return Response.json({}); }) as unknown as typeof fetch;
  await backlog.page('project-1', { type: 'bug', labels: ['frontend'], priorities: ['urgent', 'high'], page: 2, perPage: 25 }, 'token');
  const query = new URL(requested, 'http://localhost').searchParams;
  expect(query.get('type')).toBe('bug');
  expect(query.getAll('label')).toEqual(['frontend']);
  expect(query.getAll('priority')).toEqual(['urgent', 'high']);
  expect(query.get('page')).toBe('2');
});

test('backlog page sends the requested date sort and omits the default manual sort', async () => {
  const requested: string[] = [];
  g.fetch = (async (url: string) => { requested.push(url); return Response.json({}); }) as unknown as typeof fetch;
  await backlog.page('project-1', { sort: 'newest', page: 1, perPage: 10 }, 'token');
  await backlog.page('project-1', { sort: 'manual', page: 1, perPage: 10 }, 'token');
  expect(new URL(requested[0], 'http://localhost').searchParams.get('sort')).toBe('newest');
  expect(new URL(requested[1], 'http://localhost').searchParams.has('sort')).toBe(false);
});

test('ticket lookup by key uses the key endpoint', async () => {
  let requested = '';
  g.fetch = (async (url: string) => { requested = url; return Response.json({ id: 'ticket-1' }); }) as unknown as typeof fetch;
  await tickets.getByKey('TL-123', 'token');
  expect(requested).toContain('/ticket-keys/TL-123');
});

test('project updates can change the ticket key prefix', async () => {
  let body: unknown;
  g.fetch = (async (_url: string, init: RequestInit) => { body = JSON.parse(String(init.body)); return new Response(null, { status: 204 }); }) as unknown as typeof fetch;
  await projects.update('project-1', { name: 'TrackLines', description: '', key_prefix: 'TRK' }, 'token');
  expect(body).toEqual({ name: 'TrackLines', description: '', key_prefix: 'TRK' });
});

test('ticket search sends text and repeatable type filters', async () => {
  let requested = '';
  g.fetch = (async (url: string) => { requested = url; return Response.json([]); }) as unknown as typeof fetch;
  await tickets.search({ text: ' TL-123 ', project: 'p1', types: ['bug', 'task'], assignee: 'me' }, 'token');
  const query = new URL(requested, 'http://localhost').searchParams;
  expect(query.get('q')).toBe('TL-123');
  expect(query.get('project')).toBe('p1');
  expect(query.getAll('type')).toEqual(['bug', 'task']);
  expect(query.get('assignee')).toBe('me');
});

test('similar-ticket search asks for any word to match; normal search doesn\'t (TL-275)', async () => {
  let requested = '';
  g.fetch = (async (url: string) => { requested = url; return Response.json([]); }) as unknown as typeof fetch;
  await tickets.search({ text: 'build seperate', project: 'p1', match: 'any' }, 'token');
  expect(new URL(requested, 'http://localhost').searchParams.get('match')).toBe('any');
  await tickets.search({ text: 'build seperate' }, 'token');
  expect(new URL(requested, 'http://localhost').searchParams.has('match')).toBe(false);
});
