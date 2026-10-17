import { clerkMiddleware } from '@clerk/nextjs/server';
import { CSP_DIRECTIVES } from './lib/security-headers';

function isProtectedPath(pathname: string): boolean {
  return ['/dashboard', '/projects', '/boards', '/tickets', '/roadmaps', '/settings', '/my-work', '/mentions', '/chat', '/account', '/reports'].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

export default clerkMiddleware(async (auth, request) => {
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
