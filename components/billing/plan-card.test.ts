import { expect, test } from 'bun:test';
import { ApiError } from '@/lib/api';
import { billingError, planAction } from './plan-card';

test('billing errors are actionable', () => {
  expect(billingError(new ApiError(503, 'billing is not configured'), 'checkout')).toBe('Billing isn’t set up on this server yet.');
  expect(billingError(new ApiError(409, 'x'), 'checkout')).toContain('already subscribed');
  expect(billingError(new ApiError(409, 'x'), 'portal')).toContain('upgrade first');
  expect(billingError(new Error('network'), 'portal')).toBe('Couldn’t reach billing. Please try again.');
});

test('a plan granted by hand offers nothing to manage', () => {
  expect(planAction({ paid: false, project_limit: 1, billed: false })).toBe('upgrade');
  expect(planAction({ paid: true, project_limit: -1, billed: true })).toBe('manage');
  expect(planAction({ paid: true, project_limit: -1, billed: false })).toBeNull();
  expect(planAction({ paid: true, project_limit: -1 })).toBe('manage'); // older API without the flag
});
