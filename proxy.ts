import { clerkMiddleware } from '@clerk/nextjs/server';
import { CSP_DIRECTIVES } from './lib/server/security-headers';

function isProtectedPath(pathname: string): boolean {
  return ['/dashboard', '/projects', '/boards', '/tickets', '/roadmaps', '/settings', '/my-work', '/mentions', '/chat', '/account', '/reports'].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

// probe: a request no page takes. TrackLin.es has no server actions, so pages are only ever read (GET,
// HEAD); writes go to /api/… route handlers and Clerk's /__clerk/…. Scanners POST forms to /api, /app or
// /RSC/<x>.txt, which Next tries to parse as a server action and reports as a crash.
export const probe = (method: string, pathname: string, headers: Headers) =>
  headers.has('next-action') || (method !== 'GET' && method !== 'HEAD' && !pathname.startsWith('/api/') && !pathname.startsWith('/__clerk/'));

export default clerkMiddleware(async (auth, request) => {
  if (probe(request.method, request.nextUrl.pathname, request.headers)) return new Response(null, { status: 404 });
  if (isProtectedPath(request.nextUrl.pathname)) {
    await auth.protect();
  }
}, {
  contentSecurityPolicy: {
    strict: true,
    directives: CSP_DIRECTIVES,
  },
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
