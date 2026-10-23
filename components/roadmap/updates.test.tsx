import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { HEALTH, MAX_NOTE, newestFirst, RoadmapUpdates, UpdateComposer, UpdatesTimeline } from './updates';
import { NotAManager } from '@/app/roadmaps/[id]/edit/page';
import { RoadmapRow } from '@/components/project/roadmap-row';
import type { RoadmapUpdate } from '@/lib/api';

const updates: RoadmapUpdate[] = [
  { id: 'u1', health: 'at_risk', note: 'Waiting on design', published_at: '2026-10-01T09:00:00Z', author: 'Ava Admin' },
  { id: 'u2', health: 'on_track', note: 'Design approved\nBuilding now', published_at: '2026-10-08T09:00:00Z', author: 'Claude' },
  { id: 'u3', health: 'off_track', note: 'Before authors were recorded', published_at: '2026-09-01T09:00:00Z' },
];

test('the timeline lists updates newest first, each with its health, date and who posted it (TL-87, TL-413)', () => {
  expect(newestFirst(updates.slice(0, 2)).map((u) => u.id)).toEqual(['u2', 'u1']);
  const html = renderToStaticMarkup(<UpdatesTimeline updates={updates.slice(0, 2)} />);
  expect(html.indexOf('Design approved')).toBeLessThan(html.indexOf('Waiting on design'));
  for (const s of ['On track', 'At risk', 'Ava Admin', 'Claude', 'dateTime="2026-10-08T09:00:00Z"', 'whitespace-pre-line']) expect(html).toContain(s);
  // an update from before authors were recorded shows no name rather than a blank one
  expect(renderToStaticMarkup(<UpdatesTimeline updates={[updates[2]]} />)).not.toContain('· ');
  expect(Object.keys(HEALTH)).toEqual(['on_track', 'at_risk', 'off_track']);
});

test('empty and loading states', () => {
  expect(renderToStaticMarkup(<UpdatesTimeline updates={[]} />)).toContain('No updates yet.');
  expect(renderToStaticMarkup(<RoadmapUpdates roadmapId="r" token="t" canManage={false} />)).toContain('Loading updates…');
});

test('posting says updates are permanent and show your name; only managers get the form (TL-413)', () => {
  const html = renderToStaticMarkup(<UpdateComposer roadmapId="r" token="t" onPosted={() => {}} />);
  for (const s of ['Health', 'Note', `maxLength="${MAX_NOTE}"`, 'can’t be edited or deleted', 'with your name', 'Post update']) expect(html).toContain(s);
  expect(MAX_NOTE).toBe(2000); // backend roadmaps.MaxUpdateNoteRunes
  expect(renderToStaticMarkup(<RoadmapUpdates roadmapId="r" token="t" canManage />)).toContain('aria-label="Post an update"');
  expect(renderToStaticMarkup(<RoadmapUpdates roadmapId="r" token="t" canManage={false} />)).not.toContain('Post an update');
});

test('people who can’t change roadmaps see why, and no Edit links (TL-413)', async () => {
  const html = renderToStaticMarkup(<NotAManager roadmap={{ id: 'r1', project_id: 'p1' }} />);
  expect(html).toContain('Only organization admins and this project’s team leaders can change its roadmaps.');
  expect(html).toContain('href="/r/r1"');
  const roadmap = { id: 'r1', project_id: 'p1', title: 'Launch', description: '', visibility: 'public' as const, created_at: '', updated_at: '' };
  const row = (canManage: boolean) => renderToStaticMarkup(<ul><RoadmapRow roadmap={roadmap} canManage={canManage} /></ul>);
  expect(row(true)).toContain('href="/roadmaps/r1/edit"');
  expect(row(false)).not.toContain('/edit');
  const page = await Bun.file(new URL('../../app/r/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('{r.can_manage && <Link href={`/roadmaps/${r.id}/edit`}'); // the public view offers Edit only to managers
  expect(page).toContain('<UpdatesTimeline updates={updates} />'); // and shows the updates to every reader
  const project = await Bun.file(new URL('../../app/projects/[id]/page.tsx', import.meta.url)).text();
  expect(project).toContain("{manageRoadmaps && <Button variant=\"outline\" onClick={() => setDialog('roadmap')}><Trans>New roadmap</Trans></Button>}");
});
