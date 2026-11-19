import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { Project, Team } from '@/lib/api';
import { ManageProjectsView, projectAction } from './manage-projects';

const project = (over: Partial<Project>): Project => ({
  id: 'p1', name: 'Web', description: '', key_prefix: 'WEB', created_at: '', updated_at: '',
  stats: { boards: 1, roadmaps: 0, open: 2, done: 5, backlog: 1, urgent: 0, active: '' }, ...over,
});
const team: Team = { id: 't1', org_id: 'o', name: 'Platform', description: '', created_at: '', updated_at: '' };
const view = (data: Parameters<typeof ManageProjectsView>[0]['data'], busy: string | null = null) =>
  renderToStaticMarkup(<ManageProjectsView data={data} error="" busy={busy} onAction={() => {}} onToggleTeam={() => {}} />);

test('never used → delete; used → archive; archived → restore (TL-908)', () => {
  expect(projectAction({ deletable: true })).toBe('delete');
  expect(projectAction({ deletable: false })).toBe('archive');
  expect(projectAction({ archived_at: '2026-11-19T09:00:00Z', deletable: false })).toBe('restore');
});

test('lists active and archived projects with key, tickets, owning teams and the right action', () => {
  const html = view({
    active: [project({ deletable: false }), project({ id: 'p2', name: 'Oops', key_prefix: 'OOP', deletable: true, stats: undefined })],
    archived: [project({ id: 'p3', name: 'Old', key_prefix: 'OLD', archived_at: '2026-11-01T10:00:00Z' })],
    teams: [team], owners: { p1: ['t1'] },
  });
  expect(html).toContain('href="/projects/p1"');
  expect(html).toContain('WEB');
  expect(html).toContain('3 open · 5 done');
  expect(html).toContain('Platform');
  expect(html).toContain('No team'); // Oops has no owner
  expect(html).toContain('>Archive<');
  expect(html).toContain('>Delete<');
  expect(html).toContain('>Restore<');
  expect(html).toContain('Archived <time dateTime="2026-11-01T10:00:00Z"');
});

test('empty states, no teams, loading, and a busy row', () => {
  const empty = view({ active: [], archived: [], teams: [], owners: {} });
  expect(empty).toContain('No projects yet.');
  expect(empty).toContain('No archived projects.');
  expect(view({ active: [project({})], archived: [], teams: [], owners: {} })).toContain('No teams yet');
  expect(view(null)).toContain('Loading…');
  expect(view({ active: [project({})], archived: [], teams: [team], owners: {} }, 'p1')).toContain('disabled');
});
