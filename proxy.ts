import { clerkMiddleware } from '@clerk/nextjs/server';
import { CSP_DIRECTIVES } from './lib/server/security-headers';

function isProtectedPath(pathname: string): boolean {
  return ['/dashboard', '/onboarding', '/projects', '/boards', '/tickets', '/roadmaps', '/settings', '/my-work', '/mentions', '/chat', '/account', '/reports'].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

// probe: a request no page takes. Our pages are only ever read (GET, HEAD); writes go to /api/… route
// handlers and Clerk's /__clerk/…. Scanners POST forms to /api, /app or /RSC/<x>.txt, which Next tries to
// parse as a server action and reports as a crash. The one real server action is Clerk's: ClerkProvider
// calls invalidateCacheAction before setActive (choosing an org), and never finishes if it's refused.
const serverAction = (method: string, headers: Headers) =>
  method === 'POST' && headers.has('next-action') && (headers.get('accept') ?? '').includes('text/x-component');

export const probe = (method: string, pathname: string, headers: Headers) =>
  !serverAction(method, headers) &&
  (headers.has('next-action') || (method !== 'GET' && method !== 'HEAD' && !pathname.startsWith('/api/') && !pathname.startsWith('/__clerk/')));

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
