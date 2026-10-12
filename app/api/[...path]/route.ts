import type { NextRequest } from 'next/server';
import { backendURL, requestHeaders, responseHeaders } from '@/lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };

// Browser → backend for /api/…: only /api paths, without the browser's cookies or made-up client
// addresses, and only safe response headers back (lib/proxy.ts has the rules and their tests).
async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const destination = backendURL(path, request.nextUrl.search, process.env.BACKEND_URL ?? 'http://backend:8080');
  if (!destination) return new Response('bad path', { status: 400 });

  const init: RequestInit = {
    method: request.method,
    headers: requestHeaders(request.headers),
    cache: 'no-store',
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(destination, init);
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
