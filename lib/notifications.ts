import type { AppNotification, Assignee } from './api';

// Where a notification goes when clicked: its ticket, else its board.
export function notificationHref(n: Pick<AppNotification, 'ticket_id' | 'ticket_key' | 'board_id'>): string | null {
  if (n.ticket_key) return `/tickets/${n.ticket_key}`;
  if (n.ticket_id) return `/tickets/${n.ticket_id}`;
  if (n.board_id) return `/boards/${n.board_id}`;
  return null;
}

// Who did it, by name: people from the org's member list, agents by their key name.
export function actorName(actor: string, people: Assignee[]): string {
  if (!actor) return 'Someone';
  const p = people.find((x) => x.id === actor);
  if (p) return p.label === 'You' ? 'You' : p.label;
  return actor.startsWith('user_') ? 'Someone' : actor;
}

// The line a notification reads as: "Ava assigned you TL-12: Fix login".
export function notificationLine(n: Pick<AppNotification, 'actor' | 'text'>, people: Assignee[]): string {
  return `${actorName(n.actor, people)} ${n.text}`;
}

// newSince: unread notifications created after `since` (to pop up on the desktop), oldest first.
export function newSince(list: AppNotification[], since: string | null): AppNotification[] {
  return list.filter((n) => !n.read_at && (since === null || n.created_at > since)).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// newest is the latest created_at in the list (what the desktop popups have caught up to).
export function newest(list: AppNotification[], fallback: string | null): string | null {
  return list.reduce<string | null>((m, n) => (m === null || n.created_at > m ? n.created_at : m), fallback);
}
