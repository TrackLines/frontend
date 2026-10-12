// The /api proxy's rules (app/api/[...path]/route.ts), kept pure so they can be tested.

// backendURL is where /api/<path> goes on the backend, or null when the path tries to leave /api
// (".." or "." segments, or segments hiding a slash), so the proxy can only ever reach /api/….
export function backendURL(path: string[], search: string, backend: string): URL | null {
  if (path.some((p) => p === '' || p === '.' || p === '..' || p.includes('/') || p.includes('\\'))) return null;
  const url = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, backend);
  if (!url.pathname.startsWith('/api/')) return null;
  url.search = search;
  return url;
}

// Never forwarded to the backend: hop-by-hop or per-connection headers; the browser's Origin (the
// backend's CORS is for direct browser callers); its cookies (the backend uses the Authorization
// header and never reads them); and client-claimed addresses, which anyone can make up.
const DROP_REQUEST = ['host', 'origin', 'connection', 'content-length', 'accept-encoding', 'cookie',
  'x-forwarded-for', 'x-real-ip', 'forwarded', 'x-forwarded-host', 'true-client-ip', 'cf-connecting-ip'];

// requestHeaders is what the backend gets. X-Forwarded-For becomes just its right-most hop: the
// address our hosting's edge saw (the backend's rate limits key on it). Earlier hops came from the
// client. It's never dropped outright: then every visitor would look like this server.
export function requestHeaders(incoming: Headers): Headers {
  const out = new Headers(incoming);
  const hops = (incoming.get('x-forwarded-for') ?? '').split(',').map((h) => h.trim()).filter(Boolean);
  for (const name of DROP_REQUEST) out.delete(name);
  if (hops.length) out.set('x-forwarded-for', hops[hops.length - 1]);
  return out;
}

// Only these backend response headers reach the browser: no Set-Cookie, no internal redirects
// (Location), nothing hop-by-hop. Retry-After and X-RateLimit-* explain 429s.
const KEEP_RESPONSE = ['content-type', 'cache-control', 'content-disposition', 'retry-after',
  'x-ratelimit-limit', 'x-ratelimit-remaining', 'etag', 'last-modified', 'vary', 'x-request-id'];

export function responseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  for (const name of KEEP_RESPONSE) {
    const v = upstream.get(name);
    if (v !== null) out.set(name, v);
  }
  return out;
}
