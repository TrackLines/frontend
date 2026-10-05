import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisibilityBadge, VisibilitySelect } from './visibility';

test('select: default checked, team disabled', () => {
  const html = renderToStaticMarkup(<VisibilitySelect defaultValue="login_only" />);
  const input = (v: string) => html.match(new RegExp(`<input[^>]*value="${v}"[^>]*>`))![0];
  expect(input('login_only')).toContain('checked=""');
  expect(input('public')).not.toContain('checked');
  expect(input('team')).toContain('disabled=""');
});

test('badge labels', () => {
  expect(renderToStaticMarkup(<VisibilityBadge value="public" />)).toContain('Public');
  expect(renderToStaticMarkup(<VisibilityBadge value="login_only" />)).toContain('Signed-in users');
});
