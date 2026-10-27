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

// Never forwarded to the backend: hop-by-hop or per-connection headers; the browser's Origin when it's
// this site (the app's own calls aren't cross-site); its cookies (the backend uses the Authorization
// header and never reads them); and client-claimed addresses, which anyone can make up. Another site's
// Origin does go through: an embedded roadmap or request form calls /api from the customer's page, and
// the backend's CORS answers for it (allowed sites get their origin back; anything else stays refused).
const DROP_REQUEST = ['host', 'origin', 'connection', 'content-length', 'accept-encoding', 'cookie',
  'x-forwarded-for', 'x-real-ip', 'forwarded', 'x-forwarded-host', 'true-client-ip', 'cf-connecting-ip'];

// requestHeaders is what the backend gets. X-Forwarded-For becomes just its right-most hop: the
// address our hosting's edge saw (the backend's rate limits key on it). Earlier hops came from the
// client. It's never dropped outright: then every visitor would look like this server.
export function requestHeaders(incoming: Headers): Headers {
  const out = new Headers(incoming);
  const hops = (incoming.get('x-forwarded-for') ?? '').split(',').map((h) => h.trim()).filter(Boolean);
  const origin = incoming.get('origin');
  for (const name of DROP_REQUEST) out.delete(name);
  if (origin && !sameSite(origin, incoming.get('x-forwarded-host') ?? incoming.get('host'))) out.set('origin', origin);
  if (hops.length) out.set('x-forwarded-for', hops[hops.length - 1]);
  return out;
}

// sameSite: whether origin is the site the request came in on (the host it was sent to). Unparseable is
// treated as ours, so it's dropped as before.
function sameSite(origin: string, host: string | null): boolean {
  try {
    return !host || new URL(origin).host === host;
  } catch {
    return true;
  }
}

// Only these backend response headers reach the browser: no Set-Cookie, no internal redirects
// (Location), nothing hop-by-hop. Retry-After and X-RateLimit-* explain 429s; Access-Control-* are the
// backend's answer to an embed's site (TL-494).
const KEEP_RESPONSE = ['content-type', 'cache-control', 'content-disposition', 'retry-after',
  'x-ratelimit-limit', 'x-ratelimit-remaining', 'etag', 'last-modified', 'vary', 'x-request-id',
  'access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-max-age'];

export function responseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  for (const name of KEEP_RESPONSE) {
    const v = upstream.get(name);
    if (v !== null) out.set(name, v);
  }
  return out;
}

// readCapped reads a request body up to max bytes, stopping as soon as it's over (TL-382): a declared
// Content-Length over max is refused unread, and a body without one is cut off mid-stream.
// null: too big.
export async function readCapped(request: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get('content-length') ?? '');
  if (declared > max) return null;
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(size));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.byteLength; }
  return out;
}

// MAX_PROXY_BODY: the largest body the backend takes (its webhooks, 5 MiB); anything bigger is a 413 here.
export const MAX_PROXY_BODY = 5 << 20;
