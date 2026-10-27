import type { NextRequest } from 'next/server';
import { backendURL, MAX_PROXY_BODY, readCapped, requestHeaders, responseHeaders } from '@/lib/api/proxy';
import { reportServer } from '@/lib/server/report';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };

// Browser → backend for /api/…: only /api paths, without the browser's cookies or made-up client
// addresses, and only safe response headers back (lib/api/proxy.ts has the rules and their tests).
async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const destination = backendURL(path, request.nextUrl.search, process.env.BACKEND_URL ?? 'http://backend:8080');
  if (!destination) return new Response('bad path', { status: 400 });

  const init: RequestInit = {
    method: request.method,
    headers: requestHeaders(request.headers),
    cache: 'no-store',
    redirect: 'manual',
    signal: request.signal, // the browser left (e.g. a board's live stream): stop asking the backend too
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await readCapped(request, MAX_PROXY_BODY); // never buffer more than the backend would take (TL-382)
    if (!body) return new Response('request too large', { status: 413 });
    init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(destination, init);
  } catch (err) {
    // the browser left before the backend answered (a live stream closed, a page changed): our own
    // abort, not the backend failing, so nothing to report and nobody to answer
    if (request.signal.aborted) return new Response(null, { status: 499 });
    // the backend is down or unreachable: Bugfixes hears it from here, since the backend can't say (TL-292)
    // its message, or (when it has none) its name and cause, so a report never ends in nothing
    const why = !(err instanceof Error) ? String(err) : err.message || [err.name, err.cause instanceof Error ? err.cause.message : ''].filter(Boolean).join(': ');
    await reportServer('backend unreachable from the /api proxy', `${request.method} /api/${path.join('/')}: ${why}`);
    return new Response('backend unavailable', { status: 502 });
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream.headers),
  });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward; // an embed's preflight: the backend says whether its site is allowed
