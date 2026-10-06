import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const backend = process.env.BACKEND_URL ?? 'http://backend:8080';
  const destination = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, backend);
  destination.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  // This is a server-to-server request. Forwarding the browser's Origin makes
  // the backend treat it as a cross-origin request and reject production POSTs
  // because its CORS allowlist is for direct browser callers only.
  for (const name of ['host', 'origin', 'connection', 'content-length', 'accept-encoding']) {
    headers.delete(name);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(destination, init);
  const responseHeaders = new Headers(upstream.headers);
  for (const name of ['connection', 'content-length', 'content-encoding', 'transfer-encoding']) {
    responseHeaders.delete(name);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
