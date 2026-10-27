import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { WorkingWeekForm } from './working-week';

// TL-510: the days in the order the week starts, the start day, the hours
test('the form: days from the first day of the week, ticked where worked, and the hours', () => {
  const html = render(<WorkingWeekForm value={{ days: [0, 1, 2, 3, 4], week_start: 0, start_minute: 480, end_minute: 1080 }} onChange={() => {}} />);
  expect(html.indexOf('Sunday')).toBeLessThan(html.indexOf('Monday'));
  expect(html.indexOf('Thursday')).toBeLessThan(html.indexOf('Friday'));
  expect((html.match(/aria-checked="true"|data-checked=""/g) ?? []).length).toBeGreaterThanOrEqual(5);
  expect(html).toContain('value="08:00"');
  expect(html).toContain('value="18:00"');
  expect(html).not.toContain('Pick at least one working day');
  const bad = render(<WorkingWeekForm value={{ days: [], week_start: 1, start_minute: 540, end_minute: 1020 }} onChange={() => {}} />);
  expect(bad).toContain('Pick at least one working day');
  const monday = render(<WorkingWeekForm value={{ days: [1, 2, 3, 4, 5], week_start: 1, start_minute: 540, end_minute: 1020 }} onChange={() => {}} />);
  expect(monday.indexOf('Monday')).toBeLessThan(monday.indexOf('Sunday')); // Monday first, Sunday last
});

test('where it’s set: an org Settings card and page, and Edit project (source)', async () => {
  const settings = await Bun.file(new URL('../../app/settings/page.tsx', import.meta.url)).text();
  expect(settings).toContain('href="/settings/working-week"');
  const page = await Bun.file(new URL('../../app/settings/working-week/page.tsx', import.meta.url)).text();
  expect(page).toContain('<OrgWorkingWeek token={token} admin={admin} />');
  const project = await Bun.file(new URL('../../app/projects/[id]/edit/page.tsx', import.meta.url)).text();
  expect(project).toContain('<ProjectWorkingWeek token={token} projectId={project.id} canManage={admin} />');
  const countdown = await Bun.file(new URL('../ticket/timebox-countdown.tsx', import.meta.url)).text();
  expect(countdown).toContain('weekFor(useWorkingWeeks(useToken()), projectId)');
});
