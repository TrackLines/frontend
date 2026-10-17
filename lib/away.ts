import type { Assignee } from './api';

// Who's on holiday (TL-410), from Google Calendar (TL-407), in words, in the viewer's time zone.

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// lastMoment: when they're away until, as people say it. Leave ending at midnight is the day before
// ("until Fri 23 Oct", not "until Sat"); leave ending in the day is a time ("until 17:00").
export function untilText(until: string, now = new Date()): string {
  const end = new Date(until);
  if (end.getHours() === 0 && end.getMinutes() === 0) return `until ${dayFmt.format(new Date(end.getTime() - 1))}`;
  if (sameDay(end, now)) return `until ${timeFmt.format(end)}`;
  return `until ${dayFmt.format(end)}, ${timeFmt.format(end)}`;
}

// awayText: "On holiday until Fri 23 Oct", "Company day off until …", "Off from Thu 23 Oct", or null.
export function awayText(person: Pick<Assignee, 'away' | 'away_next'> | undefined, now = new Date()): string | null {
  if (person?.away) return `${person.away.company ? 'Company day off' : 'On holiday'} ${untilText(person.away.until, now)}`;
  if (person?.away_next) {
    const from = new Date(person.away_next.from);
    return `Off from ${sameDay(from, now) ? timeFmt.format(from) : dayFmt.format(from)}`;
  }
  return null;
}

// isAway: on holiday right now (not just soon).
export const isAway = (id: string, people: Assignee[] | null | undefined) => !!people?.find((p) => p.id === id)?.away;

// nextPresent: the next turn after index whose person isn't away; the review (people.length) if
// everyone left is away. Standup's Next skips people on holiday (TL-410).
export function nextPresent(ids: string[], index: number, people: Assignee[] | null | undefined): number {
  let i = index + 1;
  while (i < ids.length && isAway(ids[i], people)) i++;
  return i;
}
