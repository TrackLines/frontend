import { afterAll, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';

// a fake backend that echoes what it received
const seen: { path: string; headers: Record<string, string>; body: string }[] = [];
const backend = Bun.serve({
  port: 0,
  async fetch(req) {
    seen.push({ path: new URL(req.url).pathname + new URL(req.url).search, headers: Object.fromEntries(req.headers), body: await req.text() });
    if (new URL(req.url).pathname === '/api/limited') {
      return new Response('slow down', { status: 429, headers: { 'retry-after': '30', 'set-cookie': 'x=1' } });
    }
    return Response.json({ ok: true }, { headers: { 'set-cookie': 'track=1' } });
  },
});
process.env.BACKEND_URL = `http://localhost:${backend.port}`;
afterAll(() => backend.stop());
const { GET, POST } = await import('./route');

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

test('a request goes through cleaned up and comes back without cookies (TL-163)', async () => {
  const req = new NextRequest('https://tracklin.es/api/tickets/TL-1?x=1', {
    method: 'POST', body: '{"a":1}',
    headers: { authorization: 'Bearer jwt', 'content-type': 'application/json', cookie: '__session=secret', 'x-forwarded-for': '6.6.6.6, 203.0.113.7' },
  });
  const res = await POST(req, ctx(['tickets', 'TL-1']));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(res.headers.has('set-cookie')).toBe(false);
  const got = seen.at(-1)!;
  expect(got.path).toBe('/api/tickets/TL-1?x=1');
  expect(got.body).toBe('{"a":1}');
  expect(got.headers.authorization).toBe('Bearer jwt');
  expect(got.headers.cookie).toBeUndefined();
  expect(got.headers['x-forwarded-for']).toBe('203.0.113.7');
});

test('.. never reaches the backend; a 429 keeps Retry-After', async () => {
  const before = seen.length;
  const bad = await GET(new NextRequest('https://tracklin.es/api/%2e%2e/mcp'), ctx(['..', 'mcp']));
  expect(bad.status).toBe(400);
  expect(seen.length).toBe(before);
  const limited = await GET(new NextRequest('https://tracklin.es/api/limited'), ctx(['limited']));
  expect(limited.status).toBe(429);
  expect(limited.headers.get('retry-after')).toBe('30');
  expect(limited.headers.has('set-cookie')).toBe(false);
});
