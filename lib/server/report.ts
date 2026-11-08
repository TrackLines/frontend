// Errors to Bugfixes (TL-292). Only the server holds the Bugfixes credentials: the server reports
// directly; the browser posts to /api/client-errors, which reports for it.

// reportServer sends one error to Bugfixes from the server. Reporting never throws.
export async function reportServer(message: string, detail: string): Promise<void> {
  if (typeof window !== 'undefined') return;
  try {
    const { error } = await import('bugfixes');
    error(message, detail);
  } catch {
    // reporting must never replace the failure it reports
  }
}

export type ClientReport = { kind: string; message: string; stack: string; path: string };

const KINDS = ['error', 'rejection', 'boundary', 'api'];
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

// cleanReport keeps what's worth reporting from a browser's report, cut to size; null: nothing to report.
export function cleanReport(body: unknown): ClientReport | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const message = clip(b.message, 1000).trim();
  if (!message) return null;
  const kind = KINDS.includes(b.kind as string) ? (b.kind as string) : 'error';
  // only the path: query strings can carry codes and ids (e.g. /chat/link?code=…)
  const path = clip(b.path, 500).split(/[?#]/)[0];
  return { kind, message, stack: clip(b.stack, 8000), path };
}

// ponytail: per-instance memory; move to Valkey if the frontend runs more than one instance and spam shows up
const seen = new Map<string, number[]>();
let all: number[] = [];

// allowReport: at most 10 reports a minute from one address, and 100 a minute in all, so a broken
// page (or someone with curl) can't flood Bugfixes.
export function allowReport(address: string, now = Date.now()): boolean {
  const recent = (seen.get(address) ?? []).filter((t) => now - t < 60_000);
  all = all.filter((t) => now - t < 60_000);
  if (recent.length >= 10 || all.length >= 100) return false;
  recent.push(now);
  all.push(now);
  seen.set(address, recent);
  if (seen.size > 10_000) seen.clear();
  return true;
}

export function resetReportLimits() {
  seen.clear();
  all = [];
}

const sent = new Set<string>();

// Clerk's codes for a session or organization that's gone (signed out elsewhere, expired, or an org you
// were removed from). Clerk signs out or moves on by itself; its own request failing isn't ours (TL-799).
const ENDED_SESSION_CODES = new Set(['authentication_invalid', 'resource_not_found', 'signed_out']);

// endedClerkSession: a Clerk API error with only those codes. Clerk's browser bundle comes from its CDN,
// a different copy from ours, so its errors are recognised by shape rather than instanceof.
export function endedClerkSession(err: unknown): boolean {
  const e = err as { clerkError?: unknown; errors?: { code?: unknown }[] } | null;
  if (!e || e.clerkError !== true || !Array.isArray(e.errors) || e.errors.length === 0) return false;
  return e.errors.every((x) => typeof x?.code === 'string' && ENDED_SESSION_CODES.has(x.code));
}

// reportClient sends a browser error to /api/client-errors, once per message per page load.
export function reportClient(kind: ClientReport['kind'], err: unknown, fallback = 'Unknown error'): void {
  if (typeof window === 'undefined') return;
  const e = err instanceof Error ? err : null;
  const message = (e?.message || (typeof err === 'string' ? err : '') || fallback).slice(0, 1000);
  const stack = e?.stack ?? '';
  if (/(chrome|moz|safari(-web)?)-extension:\/\//.test(stack)) return; // a browser extension's, not ours
  if (endedClerkSession(err)) return;
  const key = kind + message;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({ kind, message, stack: stack.slice(0, 8000), path: window.location.pathname });
  try {
    if (!navigator.sendBeacon?.('/api/client-errors', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/client-errors', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  } catch {
    // never let reporting break the page
  }
}
