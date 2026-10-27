import { expect, test } from 'bun:test';
import { backendURL, requestHeaders, responseHeaders } from './proxy';

const B = 'http://backend:8080';

test('normal paths and queries reach /api on the backend', () => {
  expect(backendURL(['tickets', 'TL-1'], '?x=1&y=2', B)?.href).toBe('http://backend:8080/api/tickets/TL-1?x=1&y=2');
  expect(backendURL(['search'], '', B)?.href).toBe('http://backend:8080/api/search');
  // ids with odd characters are encoded, not interpreted
  expect(backendURL(['intake', 'a b?c'], '', B)?.pathname).toBe('/api/intake/a%20b%3Fc');
});

test('nothing outside /api: dot segments and hidden slashes are refused (TL-163)', () => {
  // Next decodes /api/%2e%2e/mcp and /api/..%2Fhealth into these segments
  for (const path of [['..', 'mcp'], ['.', 'tickets'], ['tickets', '..', '..', 'health'], ['..%2Fhealth'.replace('%2F', '/')], ['a\\..\\mcp'], ['']]) {
    expect(backendURL(path, '', B)).toBeNull();
  }
});

test('the backend gets the edge-seen address, not made-up ones, and no cookies', () => {
  const h = requestHeaders(new Headers({
    authorization: 'Bearer jwt', 'content-type': 'application/json', 'tracklines-timezone': 'Europe/London',
    cookie: '__session=secret; __client_uat=1', origin: 'https://tracklin.es', host: 'tracklin.es',
    'x-forwarded-for': '6.6.6.6, 1.2.3.4, 203.0.113.7', 'x-real-ip': '6.6.6.6', forwarded: 'for=6.6.6.6',
  }));
  expect(h.get('x-forwarded-for')).toBe('203.0.113.7'); // right-most only
  for (const gone of ['cookie', 'origin', 'host', 'x-real-ip', 'forwarded']) expect(h.has(gone)).toBe(false);
  expect(h.get('authorization')).toBe('Bearer jwt'); // what the backend needs still goes
  expect(h.get('content-type')).toBe('application/json');
  expect(h.get('tracklines-timezone')).toBe('Europe/London');
  // no forwarding header at all: none invented
  expect(requestHeaders(new Headers({ authorization: 'x' })).has('x-forwarded-for')).toBe(false);
});

test('only safe headers come back: no Set-Cookie or internal redirects; 429s keep Retry-After', () => {
  const h = responseHeaders(new Headers({
    'content-type': 'application/json', 'retry-after': '30', 'x-ratelimit-remaining': '0', 'x-ratelimit-limit': '10',
    'set-cookie': 'track=1', location: 'http://backend:8080/api/x/', 'content-encoding': 'gzip', 'transfer-encoding': 'chunked',
    'cache-control': 'no-store', server: 'go',
  }));
  expect(h.get('content-type')).toBe('application/json');
  expect(h.get('retry-after')).toBe('30');
  expect(h.get('x-ratelimit-remaining')).toBe('0');
  expect(h.get('cache-control')).toBe('no-store');
  for (const gone of ['set-cookie', 'location', 'content-encoding', 'transfer-encoding', 'server']) expect(h.has(gone)).toBe(false);
});

// TL-494: an embedded roadmap or request form calls /api from the customer's page; the backend's CORS
// decides, so it must see that site's Origin and its answer must reach the browser
test('an embed: another site’s Origin goes to the backend, its CORS answer comes back', () => {
  const embed = requestHeaders(new Headers({ origin: 'https://interviews.tools', host: 'tracklin.es' }));
  expect(embed.get('origin')).toBe('https://interviews.tools');
  expect(embed.has('host')).toBe(false);
  // ours, however the edge names the host: still dropped
  expect(requestHeaders(new Headers({ origin: 'https://tracklin.es', host: 'frontend.railway.internal', 'x-forwarded-host': 'tracklin.es' })).has('origin')).toBe(false);
  expect(requestHeaders(new Headers({ origin: 'null', host: 'tracklin.es' })).has('origin')).toBe(false);
  const back = responseHeaders(new Headers({
    'access-control-allow-origin': 'https://interviews.tools', 'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type', 'access-control-max-age': '86400', vary: 'Origin',
  }));
  expect(back.get('access-control-allow-origin')).toBe('https://interviews.tools');
  expect(back.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
  expect(back.get('access-control-max-age')).toBe('86400');
  expect(back.get('vary')).toBe('Origin');
});

test('preflights go to the backend', async () => {
  const route = await Bun.file(new URL('../../app/api/[...path]/route.ts', import.meta.url)).text();
  expect(route).toContain('export const OPTIONS = forward;');
});
