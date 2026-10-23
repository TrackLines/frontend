import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Assignee } from './api';
import { dates } from './i18n';

// Who's on holiday (TL-410), from Google Calendar (TL-407), in words, in the viewer's time zone.

const dayFmt = (i18n: I18n) => dates(i18n, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = (i18n: I18n) => dates(i18n, { hour: 'numeric', minute: '2-digit' });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// lastMoment: when they're away until, as people say it. Leave ending at midnight is the day before
// ("until Fri 23 Oct", not "until Sat"); leave ending in the day is a time ("until 17:00").
export function untilText(until: string, i18n: I18n, now = new Date()): string {
  const end = new Date(until);
  if (end.getHours() === 0 && end.getMinutes() === 0) {
    const day = dayFmt(i18n).format(new Date(end.getTime() - 1));
    return i18n._(msg`until ${day}`);
  }
  const time = timeFmt(i18n).format(end);
  if (sameDay(end, now)) return i18n._(msg`until ${time}`);
  const day = dayFmt(i18n).format(end);
  return i18n._(msg`until ${day}, ${time}`);
}

// awayText: "On holiday until Fri 23 Oct", "Company day off until …", "Off from Thu 23 Oct", or null.
export function awayText(person: Pick<Assignee, 'away' | 'away_next'> | undefined, i18n: I18n, now = new Date()): string | null {
  if (person?.away) {
    const until = untilText(person.away.until, i18n, now);
    return person.away.company ? i18n._(msg`Company day off ${until}`) : i18n._(msg`On holiday ${until}`);
  }
  if (person?.away_next) {
    const from = new Date(person.away_next.from);
    const when = sameDay(from, now) ? timeFmt(i18n).format(from) : dayFmt(i18n).format(from);
    return i18n._(msg`Off from ${when}`);
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
