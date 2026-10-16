import { beforeEach, expect, mock, test } from 'bun:test';

// Bugfixes' SDK, recorded: what the frontend reports (TL-292)
const reported: unknown[][] = [];
mock.module('bugfixes', () => ({ error: (...a: unknown[]) => { reported.push(a); return new Error(String(a[0])); }, loadConfigFromEnv: () => ({}), setDefaultConfig: () => {} }));
const { allowReport, cleanReport, reportClient, resetReportLimits } = await import('./report');
const { POST } = await import('@/app/api/client-errors/route');
const { closedStream, onRequestError } = await import('@/instrumentation');
const proxy = await import('@/app/api/[...path]/route');

beforeEach(() => { reported.length = 0; resetReportLimits(); });

const post = (body: string, ip = '203.0.113.9') => POST(new Request('http://x/api/client-errors', { method: 'POST', body, headers: { 'x-forwarded-for': ip } }) as never);

test('a browser report is cut to size, keeps only the path, and needs a message', () => {
  expect(cleanReport({ kind: 'boundary', message: ' boom ', stack: 'at x', path: '/chat/link?code=secret#x' })).toEqual({ kind: 'boundary', message: 'boom', stack: 'at x', path: '/chat/link' });
  expect(cleanReport({ kind: 'weird', message: 'm' })?.kind).toBe('error');
  expect(cleanReport({ message: 'x'.repeat(5000) })?.message.length).toBe(1000);
  expect(cleanReport({ message: '' })).toBeNull();
  expect(cleanReport('nope')).toBeNull();
  expect(cleanReport(null)).toBeNull();
});

test('reports are limited: 10 a minute per address, 100 in all', () => {
  const now = 1_000_000;
  for (let i = 0; i < 10; i++) expect(allowReport('a', now)).toBe(true);
  expect(allowReport('a', now)).toBe(false);
  expect(allowReport('a', now + 61_000)).toBe(true); // a minute on
  resetReportLimits();
  for (let i = 0; i < 100; i++) allowReport(`ip${i}`, now);
  expect(allowReport('fresh', now)).toBe(false);
});

test('the browser\'s errors reach Bugfixes through /api/client-errors, always answered 204', async () => {
  const res = await post(JSON.stringify({ kind: 'rejection', message: 'fetch failed', stack: 'at Board', path: '/boards/b1?x=1' }));
  expect(res.status).toBe(204);
  expect(reported).toEqual([['browser rejection: fetch failed', '/boards/b1\nat Board']]);
  expect((await post('not json')).status).toBe(204);
  expect((await post('x'.repeat(20_000))).status).toBe(204);
  expect(reported.length).toBe(1);
  for (let i = 0; i < 20; i++) await post(JSON.stringify({ message: `m${i}` }), '198.51.100.1');
  expect(reported.length).toBe(11); // that address: 10 a minute
});

test('a crash on the server goes to Bugfixes, without the query string', async () => {
  await onRequestError(new Error('render failed'), { path: '/chat/link?code=secret', method: 'GET' }, { routePath: '/chat/link', routeType: 'render' });
  expect(reported.length).toBe(1);
  expect(reported[0][0]).toBe('server render error: render failed');
  expect(String(reported[0][1])).toStartWith('GET /chat/link (/chat/link)');
  expect(String(reported[0][1])).not.toContain('secret');
});

test('the /api proxy reports a backend it can\'t reach, and answers 502', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof fetch;
  try {
    const { NextRequest } = await import('next/server');
    const res = await proxy.GET(new NextRequest('http://x/api/boards'), { params: Promise.resolve({ path: ['boards'] }) });
    expect(res.status).toBe(502);
    expect(reported).toEqual([['backend unreachable from the /api proxy', 'GET /api/boards: ECONNREFUSED']]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the browser sends each error once, and never a browser extension\'s', () => {
  const beacons: string[] = [];
  const g = globalThis as Record<string, unknown>;
  g.window = { location: { pathname: '/boards/b1' } };
  g.navigator = { sendBeacon: (_u: string, b: Blob) => { beacons.push(String((b as unknown as { size: number }).size)); return true; } };
  try {
    reportClient('error', new Error('boom'));
    reportClient('error', new Error('boom')); // same again: once
    const ext = new Error('theirs');
    ext.stack = 'at chrome-extension://abc/content.js:1';
    reportClient('error', ext);
    reportClient('rejection', 'just a string');
    expect(beacons.length).toBe(2);
  } finally {
    delete g.window;
    delete g.navigator;
  }
});

test('a live stream the browser closed isn\'t an error; other pipe failures still are (TL-293)', async () => {
  expect(closedStream(new Error('failed to pipe response'), '/api/boards/b1/live')).toBe(true);
  expect(closedStream(new Error('failed to pipe response'), '/api/projects/p1/live')).toBe(true);
  expect(closedStream(new Error('failed to pipe response'), '/api/boards/b1')).toBe(false);
  expect(closedStream(new Error('render failed'), '/api/boards/b1/live')).toBe(false);
  await onRequestError(new Error('failed to pipe response'), { path: '/api/boards/b1/live', method: 'GET' }, { routePath: '/api/[...path]', routeType: 'route' });
  expect(reported.length).toBe(0);
  await onRequestError(new Error('failed to pipe response'), { path: '/api/tickets/t1/attachments', method: 'GET' }, { routePath: '/api/[...path]', routeType: 'route' });
  expect(reported.length).toBe(1);
});

test('missing files get the global 404, which skips the root layout and its Clerk calls (TL-298)', async () => {
  expect(await Bun.file(new URL('../next.config.ts', import.meta.url)).text()).toContain('globalNotFound: true');
  const page = await Bun.file(new URL('../app/global-not-found.tsx', import.meta.url)).text();
  expect(page).toContain('<html');
  expect(page).not.toMatch(/from '@clerk\//); // nothing that needs Clerk's middleware
  for (const icon of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
    expect(await Bun.file(new URL(`../public/${icon}`, import.meta.url)).exists()).toBe(true);
  }
});
