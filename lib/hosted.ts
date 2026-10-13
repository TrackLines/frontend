import type { Assignee, BoardLiveEvent, HostedSession } from './api';
import { personLabel } from './people';

// Hosted sessions (TL-221): the rules, kept pure for tests. The hook (use-hosted) and the bar
// (components/hosted-bar) are thin around these.

export type HostedRole = 'host' | 'follower' | 'outside';

// roleIn: the host, a follower (joined), or not in it.
export function roleIn(session: HostedSession | null, me: string | null | undefined, joined: boolean): HostedRole {
  if (!session || !me) return 'outside';
  if (session.host === me) return 'host';
  return joined ? 'follower' : 'outside';
}

// applyHosted: a live event's effect on the session. "<kind>-session" carries the whole session,
// "<kind>-session-ended" ends it; anything else leaves it as it is.
export function applyHosted(session: HostedSession | null, event: BoardLiveEvent, kind: string): HostedSession | null {
  if (event.type === `${kind}-session-ended`) return null;
  if (event.type === `${kind}-session` && isSession(event.payload)) return event.payload;
  return session;
}

// followedTicket: the ticket to open read-only for this person: the host's, while they're following.
export function followedTicket(session: HostedSession | null, role: HostedRole, following: boolean): string | null {
  return role === 'follower' && following ? session?.focus.ticketId ?? null : null;
}

// followedFilters: the host's board filters, for a follower who's following; null means use your own.
export function followedFilters(session: HostedSession | null, role: HostedRole, following: boolean): Record<string, string[]> | null {
  return role === 'follower' && following ? session?.focus.filters ?? {} : null;
}

function isSession(v: unknown): v is HostedSession {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<HostedSession>;
  return typeof s.host === 'string' && Array.isArray(s.people) && !!s.focus && typeof s.focus === 'object';
}

// refineLabel: the backlog's Refine button: "Refine" (you'll host), "Join refinement · Ava is
// hosting" while someone else's session runs, or "Back to your refinement" for its host.
export function refineLabel(session: HostedSession | null, people: Assignee[] | null, me: string | null): string {
  if (!session) return 'Refine';
  if (session.host === me) return 'Back to your refinement';
  return `Join refinement · ${personLabel(session.host, people)} is hosting`;
}
