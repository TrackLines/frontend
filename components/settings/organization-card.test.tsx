import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrganizationCard } from './organization-card';

test('only admins are offered to manage the organization; members can view it (TL-241)', () => {
  expect(renderToStaticMarkup(<OrganizationCard admin />)).toContain('Manage organization');
  const member = renderToStaticMarkup(<OrganizationCard admin={false} />);
  expect(member).toContain('View organization');
  expect(member).not.toContain('Manage');
  expect(member).not.toContain('Invite');
});
