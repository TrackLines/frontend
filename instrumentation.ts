import { loadConfigFromEnv, setDefaultConfig } from 'bugfixes';
import { reportServer } from '@/lib/server/report';

// Next.js calls register once when the server starts, and waits for it. Server secrets come from
// 1Password first (TL-525; nothing without OP_SERVICE_ACCOUNT_TOKEN), then the Bugfixes SDK reads the
// BUGFIXES_AGENT_KEY / BUGFIXES_AGENT_SECRET environment variables.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { onePassword } = await import('@/lib/server/onepassword');
    await onePassword('tracklines', {
      'bugfixes_frontend.username': 'BUGFIXES_AGENT_KEY',
      'bugfixes_frontend.credential': 'BUGFIXES_AGENT_SECRET',
      'bugfixes_frontend.service': 'BUGFIXES_SERVICE',
      'clerk_frontend.credential': 'CLERK_SECRET_KEY',
      'uploadthing_frontend.username': 'UPLOADTHING_TOKEN',
    });
  }
  setDefaultConfig(loadConfigFromEnv());
}

// closedStream: a live stream (/api/…/live) the browser closed, by leaving the board or page. Next
// can't finish sending it and says "failed to pipe response"; nothing went wrong (TL-293).
export function closedStream(e: Error, path: string): boolean {
  return /failed to pipe response/i.test(e.message) && /^\/api\/.+\/live$/.test(path);
}

// onRequestError: a page, route or proxy that crashed on the server goes to Bugfixes (TL-292).
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routePath?: string; routeType?: string }) {
  const e = err instanceof Error ? err : new Error(String(err));
  const path = request.path.split(/[?#]/)[0]; // never the query: it can carry codes
  if (closedStream(e, path)) return;
  await reportServer(`server ${context.routeType ?? 'request'} error: ${e.message}`, `${request.method} ${path} (${context.routePath ?? ''})\n${e.stack ?? ''}`);
}
