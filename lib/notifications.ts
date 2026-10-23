import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { AppNotification, Assignee } from './api';
import { generatedAgent } from './people';

// Where a notification goes when clicked: its ticket, else its board.
export function notificationHref(n: Pick<AppNotification, 'ticket_id' | 'ticket_key' | 'board_id'> & { link?: string | null }): string | null {
  if (n.link && /^\/(?![/\\])/.test(n.link)) return n.link; // a page on this site, e.g. a new Terms version (TL-424)
  if (n.ticket_id) return `/tickets/${n.ticket_id}`; // the id: keys repeat across orgs (TL-276)
  if (n.ticket_key) return `/tickets/${n.ticket_key}`;
  if (n.board_id) return `/boards/${n.board_id}`;
  return null;
}

// Who did it, by name: people from the org's member list, agents by their key name.
export function actorName(i18n: I18n, actor: string, people: Assignee[]): string {
  if (!actor) return i18n._(msg`Someone`);
  const p = people.find((x) => x.id === actor);
  if (p) return p.label === 'You' ? i18n._(msg`You`) : p.label;
  return actor.startsWith('user_') ? i18n._(msg`Someone`) : generatedAgent(i18n, actor) ?? actor;
}

// The line a notification reads as: "Ava assigned you TL-12: Fix login".
export function notificationLine(i18n: I18n, n: Pick<AppNotification, 'actor' | 'text'> & { kind?: string }, people: Assignee[]): string {
  if (n.kind === 'legal') return n.text; // from TrackLin.es itself: "We've updated our Terms of service…" (TL-424)
  return `${actorName(i18n, n.actor, people)} ${n.text}`; // text comes from the backend, in English
}

// newSince: unread notifications created after `since` (to pop up on the desktop), oldest first.
export function newSince(list: AppNotification[], since: string | null): AppNotification[] {
  return list.filter((n) => !n.read_at && (since === null || n.created_at > since)).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// newest is the latest created_at in the list (what the desktop popups have caught up to).
export function newest(list: AppNotification[], fallback: string | null): string | null {
  return list.reduce<string | null>((m, n) => (m === null || n.created_at > m ? n.created_at : m), fallback);
}
