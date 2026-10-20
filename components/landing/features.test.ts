import { expect, test } from 'bun:test';
import { FEATURES } from './features';

test('the homepage highlights following the host live in standup and refinement', () => {
  const card = FEATURES.find((f) => f.title === 'Standup and refinement, no screen sharing');
  expect(card?.body).toContain('everyone follows along live on their own screen');
});

test('the blockers card says which ticket waits: the one depending on unfinished work', () => {
  const card = FEATURES.find((f) => f.title === 'Blocked tickets wait their turn');
  expect(card?.body).toContain('When a ticket depends on another that isn’t finished, nobody can pick it up');
  expect(card?.body).toContain('The work it’s waiting on carries on as normal.');
});

test('the homepage highlights reports, holidays from Google Calendar and epics, in rows of three (owner, 2026-10-17)', () => {
  for (const title of ['Reports for project managers', 'Knows who’s on holiday', 'Epics that track themselves']) expect(FEATURES.map((f) => f.title)).toContain(title);
  expect(FEATURES.find((f) => f.title === 'Reports for project managers')?.body).toContain('never a leaderboard'); // no per-person figures
  expect(FEATURES.find((f) => f.title === 'Knows who’s on holiday')?.body).toContain('We only keep the dates');
  expect(FEATURES.length % 3).toBe(0); // the grid's rows stay even
});

test('the homepage’s plans say the member limits (TL-419)', async () => {
  const page = await Bun.file(new URL('../../app/page.tsx', import.meta.url)).text();
  expect(page).toContain('One project and up to 20 members');
  expect(page).toContain('Five projects and up to 20 members');
  expect(page).toContain('Unlimited projects and members');
});

test('the Errors become tickets card links to BugFix.es (cross promotion), named its way', () => {
  const card = FEATURES.find((f) => f.title === 'Errors become tickets');
  expect(card?.links).toEqual([{ href: 'https://bugfix.es', label: 'Find out about BugFix.es →' }]);
});

test('the homepage highlights the terminal app, Google Chat buttons and TRMNL, each with where to get it', async () => {
  const { OUR_TUI } = await import('@/lib/our-links');
  expect(FEATURES.find((f) => f.title === 'Your work in the terminal')?.links).toEqual([{ href: OUR_TUI, label: 'Get the terminal app →' }]);
  expect(OUR_TUI).toBe('https://github.com/TrackLines/tui');
  expect(FEATURES.find((f) => f.title === 'Act on it from Google Chat')?.links?.[0].href).toBe('/docs/google-chat');
  expect(FEATURES.find((f) => f.title === 'Your tickets on a TRMNL')?.links?.map((l) => l.href)).toContain('/docs/trmnl');
});
