import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { i18nFor } from '../i18n';
import { awayText, isAway, nextPresent, untilText } from './away';
import { PersonFace } from '@/components/live/person-face';
import { StandupPanel } from '@/components/live/standup';
import { assigneeItems, awayWarning } from '@/components/ticket/assignee-select';
import type { Assignee } from '../api';

// dates built in the viewer's own zone, as the app shows them
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const en = i18nFor('en');
const now = local(2026, 10, 20, 9);
const iso = (d: Date) => d.toISOString();

test('leave reads as people say it: the last day off, or a time today (TL-410)', () => {
  expect(untilText(iso(local(2026, 10, 24)), en, now)).toMatch(/^until Fri\b.*(23.*Oct|Oct.*23)/); // back Saturday = off until Friday (any locale's order)
  expect(untilText(iso(local(2026, 10, 20, 17)), en, now)).toMatch(/^until \d/); // back this afternoon
  expect(untilText(iso(local(2026, 10, 22, 13)), en, now)).toMatch(/^until Thu\b.*(22.*Oct|Oct.*22), \d/);
  expect(awayText({ away: { until: iso(local(2026, 10, 24)) } }, en, now)).toMatch(/^On holiday until Fri/);
  expect(awayText({ away: { until: iso(local(2026, 10, 21)), company: true } }, en, now)).toMatch(/^Company day off until Tue/);
  expect(awayText({ away_next: { from: iso(local(2026, 10, 22)), until: iso(local(2026, 10, 24)) } }, en, now)).toMatch(/^Off from Thu/);
  expect(awayText({}, en, now)).toBeNull(); // no Google Calendar: nothing said
});

const people: Assignee[] = [
  { id: 'u_ava', label: 'Ava', name: 'Ava Smith', kind: 'person', away: { until: iso(local(2030, 1, 5)) } },
  { id: 'u_ben', label: 'Ben', name: 'Ben Jones', kind: 'person', away_next: { from: iso(local(2030, 1, 2)), until: iso(local(2030, 1, 3)) } },
  { id: 'u_cat', label: 'Cat', name: 'Cat Lee', kind: 'person' },
  { id: 'claude', label: 'Claude', kind: 'ai' },
];

test('standup’s Next skips people on holiday; the review comes after everyone else is away', () => {
  const order = ['u_cat', 'u_ava', 'u_ben'];
  expect(nextPresent(order, 0, people)).toBe(2); // Cat → (Ava is away) → Ben
  expect(nextPresent(['u_cat', 'u_ava'], 0, people)).toBe(2); // only Ava left, away: the review
  expect(nextPresent(order, 1, people)).toBe(2);
  expect(nextPresent(order, 0, null)).toBe(1); // people still loading: nobody skipped
  expect(isAway('u_ben', people)).toBe(false); // leaving soon isn't away yet
  const html = renderToStaticMarkup(<StandupPanel standup={{ people: order.map((id) => ({ id, label: id })), index: 0, spentMs: 0, runningSince: 1 }} onAction={() => {}} canRun people={people} />);
  expect(html.match(/On holiday</g)).toHaveLength(1); // Ava only
});

test('the picker says who’s away or leaving, and warns when the assignee is away', () => {
  const items = assigneeItems(en, people, null);
  expect(items.u_ava).toMatch(/^Ava · on holiday until /);
  expect(items.u_ben).toMatch(/^Ben · off from /);
  expect(items.u_cat).toBe('Cat');
  expect(items.claude).toBe('Claude · AI');
  expect(awayWarning(en, people, 'u_ava')).toMatch(/^Ava Smith is on holiday until .*\.$/);
  expect(awayWarning(en, people, 'u_ben')).toBeNull();
  expect(awayWarning(en, people, null)).toBeNull();
});

test('faces fade, with when they’re back, while someone is away', () => {
  const ava = renderToStaticMarkup(<PersonFace id="u_ava" people={people} />);
  expect(ava).toContain('data-away=""');
  expect(ava).toMatch(/title="Ava: On holiday until /);
  expect(ava).toContain('grayscale');
  const cat = renderToStaticMarkup(<PersonFace id="u_cat" people={people} />);
  expect(cat).not.toContain('data-away');
  expect(cat).not.toContain('title=');
});
