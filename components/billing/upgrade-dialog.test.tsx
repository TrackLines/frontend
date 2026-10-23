import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';

mockDialog();
const { render: renderToStaticMarkup } = await import('@/test/i18n');
const { UpgradeDialog } = await import('./upgrade-dialog');
const render = (plan: Parameters<typeof UpgradeDialog>[0]['plan']) => renderToStaticMarkup(<UpgradeDialog open onOpenChange={() => {}} token="t" plan={plan} />);

test('at the project limit, admins see the plans above theirs; members are told to ask an admin (TL-243, TL-290)', () => {
  const free = render({ plan: 'free', paid: false, project_limit: 1, can_manage: true });
  expect(free).toContain('Free plan includes 1 project');
  expect(free).toContain('>Upgrade to Pro<');
  expect(free).toContain('>Upgrade to Enterprise<');
  const pro = render({ plan: 'pro', paid: true, project_limit: 5, billed: true, can_manage: true });
  expect(pro).toContain('Pro plan includes 5 projects');
  expect(pro).not.toContain('Upgrade to Pro');
  expect(pro).toContain('>Upgrade to Enterprise<');
  expect(pro).not.toContain('Manage billing');
  const member = render({ plan: 'free', paid: false, project_limit: 1, can_manage: false });
  expect(member).toContain('Ask an organization admin to upgrade');
  expect(member).not.toContain('>Upgrade');
});
