// Standup mode: everyone on the board gets a turn (2 min) with the board filtered to their tickets,
// then a board review with everything (5 min). Shared live through the backend; the host runs it.
import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Assignee, Ticket } from './api';
import { personLabel } from './people';

export const TURN_MS = 2 * 60_000;
export const REVIEW_MS = 5 * 60_000;

export type Participant = { id: string; label: string };

// The board's team members plus everyone with a ticket on it (people and agents), by name.
export function participants(teamIds: string[], tickets: Ticket[], names: Map<string, string>): Participant[] {
  const ids = new Set(teamIds);
  for (const t of tickets) if (t.assigned_to) ids.add(t.assigned_to);
  return [...ids]
    .map((id) => ({ id, label: names.get(id) ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// index: whose turn it is; people.length means the board review. The clock is time spent
// before the current run plus the run since runningSince (null = paused).
export type Standup = { people: Participant[]; index: number; spentMs: number; runningSince: number | null; startedBy?: string };

// speakerName: a participant's name as this viewer knows them. The standup carries the starter's
// labels, where "You" meant the starter, so each viewer names people from their own list (TL-236).
// people: the viewer's org people list (usePeople), or null while it loads.
export function speakerName(p: Participant, people: Assignee[] | null, i18n: I18n): string {
  if (people) return personLabel(i18n, p.id, people);
  return p.label === 'You' ? i18n._(msg`A teammate`) : p.label;
}

// turnTitle: "Your turn" for the viewer, "Ava’s turn" for anyone else.
export const turnTitle = (name: string, i18n: I18n) => (name === i18n._(msg`You`) ? i18n._(msg`Your turn`) : i18n._(msg`${name}’s turn`));

export const start = (people: Participant[], now: number): Standup => ({ people, index: 0, spentMs: 0, runningSince: now });

// waiting: a standup that hasn't begun: paused at the first person with no time used. It opens like
// this so people can join before the host starts the clock (TL-231).
export const waiting = (s: Standup) => s.runningSince === null && s.index === 0 && s.spentMs === 0;

// goTo jumps to a turn (or the review) with a fresh clock, running.
export const goTo = (s: Standup, index: number, now: number): Standup =>
  ({ ...s, index: Math.max(0, Math.min(index, s.people.length)), spentMs: 0, runningSince: now });

export const pause = (s: Standup, now: number): Standup =>
  s.runningSince === null ? s : { ...s, spentMs: s.spentMs + now - s.runningSince, runningSince: null };

export const resume = (s: Standup, now: number): Standup => (s.runningSince === null ? { ...s, runningSince: now } : s);

export const reviewing = (s: Standup) => s.index >= s.people.length;

// speaker is whose tickets the board shows; null during the review (everything).
export const speaker = (s: Standup): Participant | null => (reviewing(s) ? null : s.people[s.index]);

// remaining is the time left in this turn or the review; negative once it runs over.
export function remaining(s: Standup, now: number): number {
  const spent = s.spentMs + (s.runningSince === null ? 0 : now - s.runningSince);
  return (reviewing(s) ? REVIEW_MS : TURN_MS) - spent;
}

// clock shows m:ss, with "over by" once the time is up (the speaker isn't cut off mid-sentence).
export function clock(ms: number, i18n: I18n): string {
  const secs = Math.ceil(Math.abs(ms) / 1000);
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return ms < 0 ? i18n._(msg`over by ${text}`) : text;
}
