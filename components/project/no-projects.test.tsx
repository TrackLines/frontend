import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { NoProjects } from './no-projects';

test('an admin with no projects is offered to create one', () => {
  const html = renderToStaticMarkup(<NoProjects onCreate={() => {}} />);
  expect(html).toContain('Create a project');
});

test('anyone else is told who can, with nothing to press', () => {
  const html = renderToStaticMarkup(<NoProjects onCreate={null} />);
  expect(html).not.toContain('Create a project');
  expect(html).not.toContain('<button');
  expect(html).toContain('admins can create projects');
});
