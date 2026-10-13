import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';

mockDialog();
const { renderToStaticMarkup } = await import('react-dom/server');
const { UpgradeDialog } = await import('./upgrade-dialog');

test('at the project limit, admins can upgrade; members are told to ask an admin (TL-243)', () => {
  const admin = renderToStaticMarkup(<UpgradeDialog open onOpenChange={() => {}} token="t" canManage />);
  expect(admin).toContain('>Upgrade<');
  const member = renderToStaticMarkup(<UpgradeDialog open onOpenChange={() => {}} token="t" canManage={false} />);
  expect(member).toContain('ask an organization admin to upgrade');
  expect(member).not.toContain('>Upgrade<');
});
