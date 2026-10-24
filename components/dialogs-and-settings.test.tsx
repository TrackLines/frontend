import { expect, mock, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { Project } from '@/lib/api';

mockDialog();
mock.module('next/navigation', () => ({ useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
const { render: renderToStaticMarkup } = await import('@/test/i18n');
const { NameDialog } = await import('./name-dialog');
const { RoadmapEditorForm } = await import('./roadmap-editor-form');
const { ProjectKeyPrefix } = await import('./project/key-prefix');
const { EstimateSelect } = await import('./board/estimate');
const { FlowCharts } = await import('./board/flow-charts');
const { ThemeChooser } = await import('./theme-chooser');
const { FeatureFlags } = await import('./feature-flags');

test('the name dialog: title, description, extra fields, and submit waits for a name', () => {
  const html = renderToStaticMarkup(<NameDialog open onOpenChange={() => {}} title="New board" description="Start from a template" placeholder="e.g. Backend"
    submitLabel="Create board" onSubmit={async () => {}}><p>template picker</p></NameDialog>);
  for (const s of ['New board', 'Start from a template', 'placeholder="e.g. Backend"', 'template picker', 'required=""', 'maxLength="120"']) expect(html).toContain(s);
  expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*>Create board/);
  expect(renderToStaticMarkup(<NameDialog open={false} onOpenChange={() => {}} title="x" submitLabel="y" onSubmit={async () => {}} />)).toBe('');
});

test('a new roadmap starts public for admins, needs a title, and says who can read it', () => {
  const html = renderToStaticMarkup(<RoadmapEditorForm open onOpenChange={() => {}} projectId="p" onSubmit={async () => {}} canPublish />);
  for (const s of ['New roadmap', 'anyone with the link can read it', 'Public']) expect(html).toContain(s);
  expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*>Create roadmap/);
});

test('a team leader’s new roadmap starts inside the organization and can’t be made public (TL-432)', () => {
  const html = renderToStaticMarkup(<RoadmapEditorForm open onOpenChange={() => {}} projectId="p" onSubmit={async () => {}} />);
  expect(html).toContain('an organization admin can make it public');
  const input = (v: string) => html.match(new RegExp(`<input[^>]*value="${v}"[^>]*>`))![0];
  expect(input('login_only')).toContain('checked=""');
  expect(input('public')).toContain('disabled=""');
});

test('the ticket key prefix: shown to everyone, Change only for admins', () => {
  const project = { id: 'p', name: 'TrackLines', description: '', key_prefix: 'TL' } as Project;
  const member = renderToStaticMarkup(<ProjectKeyPrefix project={project} token="tok" editable={false} onChanged={() => {}} />);
  expect(member).toContain('>TL</code>');
  expect(member).not.toContain('Change');
  expect(renderToStaticMarkup(<ProjectKeyPrefix project={project} token="tok" editable onChanged={() => {}} />)).toContain('>Change<');
});

test('the estimate picker asks for a choice when one is required, else offers "Not estimated"', () => {
  expect(renderToStaticMarkup(<EstimateSelect scale="fibonacci" value="" onChange={() => {}} required />)).toContain('Choose an estimate…');
  expect(renderToStaticMarkup(<EstimateSelect scale="fibonacci" value="" onChange={() => {}} />)).toContain('Not estimated');
  const picked = renderToStaticMarkup(<EstimateSelect scale="fibonacci" value="5" onChange={() => {}} required invalid describedBy="err" />);
  for (const s of ['>5<', 'aria-invalid="true"', 'aria-describedby="err"', 'id="ticket-estimate"']) expect(picked).toContain(s);
});

test('kanban charts open from a button; the appearance menu is labelled; flags wrap the app', () => {
  expect(renderToStaticMarkup(<FlowCharts boardId="b" token="tok" />)).toContain('>Charts<');
  expect(renderToStaticMarkup(<ThemeChooser />)).toContain('aria-label="Choose appearance"');
  expect(renderToStaticMarkup(<FeatureFlags><p>the app</p></FeatureFlags>)).toContain('the app');
});

test('New board opens a dialog (closed until clicked)', async () => {
  const { NewBoardButton } = await import('./project/new-board');
  const html = renderToStaticMarkup(<NewBoardButton projectId="p" token="tok" admin variant="outline" />);
  expect(html).toContain('>New board<');
  expect(html).not.toContain('Create board');
  // only admins can make boards, so nobody else gets a button that can only fail (TL-567)
  expect(renderToStaticMarkup(<NewBoardButton projectId="p" token="tok" admin={false} />)).toBe('');
});
