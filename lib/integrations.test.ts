import { expect, test } from 'bun:test';
import { ApiError } from './api';
import { integrationError } from './integrations';

test('integration errors read as next steps', () => {
  const fallback = 'Something went wrong.';
  expect(integrationError(new ApiError(403, ''), fallback)).toContain('organization admins');
  expect(integrationError(new ApiError(503, ''), fallback)).toContain('aren’t set up on this server');
  expect(integrationError(new ApiError(400, 'the connect link has expired or wasn\'t for this organization; start again'), fallback)).toContain('Start again');
  expect(integrationError(new ApiError(400, "the connection can't see that repository"), fallback)).toBe("the connection can't see that repository");
  expect(integrationError(new ApiError(409, 'that repository is already linked to a project in this organization'), fallback)).toContain('already linked');
  expect(integrationError(new ApiError(409, 'not connected'), fallback)).toBe('Connect it first.');
  expect(integrationError(new ApiError(502, ''), fallback)).toContain('provider refused');
  expect(integrationError(new Error('x'), fallback)).toBe(fallback);
});
