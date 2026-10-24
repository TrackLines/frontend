import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
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
  expect(renderToStaticMarkup(<VisibilityBadge value="login_only" />)).toContain('Your organization');
});

test('select: only admins cross the public line (TL-432)', () => {
  const input = (html: string, v: string) => html.match(new RegExp(`<input[^>]*value="${v}"[^>]*>`))![0];
  const member = renderToStaticMarkup(<VisibilitySelect value="login_only" canPublish={false} />);
  expect(input(member, 'public')).toContain('disabled=""');
  expect(input(member, 'login_only')).not.toContain('disabled');
  expect(member).toContain('Only organization admins can make a roadmap public');
  const onPublic = renderToStaticMarkup(<VisibilitySelect value="public" canPublish={false} />);
  expect(input(onPublic, 'public')).not.toContain('disabled');
  expect(input(onPublic, 'login_only')).toContain('disabled=""');
  expect(onPublic).toContain('only organization admins can take it off public');
  const admin = renderToStaticMarkup(<VisibilitySelect value="login_only" />);
  expect(input(admin, 'public')).not.toContain('disabled');
  expect(admin).not.toContain('Only organization admins');
});
