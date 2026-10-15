import { expect, test } from 'bun:test';
import { ApiError } from '@/lib/api';
import { billingError, planActions, planText } from './plan-card';
import { formatPrice, projectsText } from '@/lib/plans';

test('billing errors are actionable', () => {
  expect(billingError(new ApiError(503, 'billing is not configured'), 'checkout')).toBe('Billing isn’t set up on this server yet.');
  expect(billingError(new ApiError(409, 'x'), 'checkout')).toContain('already subscribed');
  expect(billingError(new ApiError(409, 'x'), 'portal')).toContain('upgrade first');
  expect(billingError(new Error('network'), 'portal')).toBe('Couldn’t reach billing. Please try again.');
});

const labels = (s: Parameters<typeof planActions>[0]) => planActions(s).map((a) => a.label);

test('each plan offers the way up (TL-290): Free checks out Pro or Enterprise, Pro moves to Enterprise', () => {
  expect(planActions({ plan: 'free', paid: false, project_limit: 1, billed: false })).toEqual([
    { kind: 'checkout', plan: 'pro', label: 'Upgrade to Pro' }, { kind: 'checkout', plan: 'enterprise', label: 'Upgrade to Enterprise' }]);
  expect(planActions({ plan: 'pro', paid: true, project_limit: 5, billed: true })).toEqual([
    { kind: 'change', plan: 'enterprise', label: 'Upgrade to Enterprise' }, { kind: 'manage', label: 'Manage billing' }]);
  expect(labels({ plan: 'enterprise', paid: true, project_limit: -1, billed: true })).toEqual(['Manage billing']);
  expect(labels({ paid: true, project_limit: -1 })).toEqual(['Manage billing']); // older API: no plan, unlimited
  expect(planText({ plan: 'pro', paid: true, project_limit: 5, billed: true })).toContain('5 projects');
  expect(planText({ plan: 'free', paid: false, project_limit: 1 })).toContain('Pro has 5 projects, Enterprise unlimited');
});

test('a plan granted by hand offers nothing to manage', () => {
  expect(labels({ plan: 'enterprise', paid: true, project_limit: -1, billed: false })).toEqual([]);
  expect(planText({ plan: 'enterprise', paid: true, project_limit: -1, billed: false })).toContain('granted');
});

test('the plan is the organization’s: members see it but can’t change it (TL-243)', () => {
  expect(labels({ plan: 'free', paid: false, project_limit: 1, can_manage: false })).toEqual([]);
  expect(labels({ plan: 'pro', paid: true, project_limit: 5, billed: true, can_manage: false })).toEqual([]);
  expect(planText({ plan: 'free', paid: false, project_limit: 1, can_manage: false })).toContain('Ask an organization admin to upgrade');
  expect(billingError(new ApiError(403, 'x'), 'checkout')).toBe('Only organization admins can change the plan.');
});

test('plan limits and prices read plainly', () => {
  expect([projectsText(1), projectsText(5), projectsText(-1), projectsText(null)]).toEqual(['1 project', '5 projects', 'Unlimited projects', 'Unlimited projects']);
  expect(formatPrice({ amount: 1000, currency: 'gbp', interval: 'month' })).toBe('£10 / month');
  expect(formatPrice({ amount: 2499, currency: 'usd', interval: 'month' })).toBe('$24.99 / month');
  expect(formatPrice({ amount: 1500, currency: 'cad', interval: 'month' })).toBe('CA$15 / month');
  expect(formatPrice(null)).toBe('');
});
