import { loadConfigFromEnv, setDefaultConfig } from 'bugfixes';
import { reportServer } from '@/lib/report';

// Next.js calls register once when the server starts. The SDK reads the
// BUGFIXES_AGENT_KEY / BUGFIXES_AGENT_SECRET environment variables here.
export function register() {
  setDefaultConfig(loadConfigFromEnv());
}

// onRequestError: a page, route or proxy that crashed on the server goes to Bugfixes (TL-292).
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routePath?: string; routeType?: string }) {
  const e = err instanceof Error ? err : new Error(String(err));
  const path = request.path.split(/[?#]/)[0]; // never the query: it can carry codes
  await reportServer(`server ${context.routeType ?? 'request'} error: ${e.message}`, `${request.method} ${path} (${context.routePath ?? ''})\n${e.stack ?? ''}`);
}
