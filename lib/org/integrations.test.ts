import { expect, test } from 'bun:test';
import { i18nFor } from '../i18n';
import { ApiError } from '../api';
import { connectHint, GIT_PROVIDERS, integrationError, INTEGRATION_PROVIDERS } from './integrations';

const i18n = i18nFor('en');

test('integration errors read as next steps', () => {
  const fallback = 'Something went wrong.';
  expect(integrationError(i18n, new ApiError(403, ''), fallback)).toContain('organization admins');
  expect(integrationError(i18n, new ApiError(503, ''), fallback)).toContain('aren’t set up on this server');
  expect(integrationError(i18n, new ApiError(400, 'the connect link has expired or wasn\'t for this organization; start again'), fallback)).toContain('Start again');
  expect(integrationError(i18n, new ApiError(400, "the connection can't see that repository"), fallback)).toBe("the connection can't see that repository");
  expect(integrationError(i18n, new ApiError(409, 'that repository is already linked to a project in this organization'), fallback)).toContain('already linked');
  expect(integrationError(i18n, new ApiError(409, 'not connected'), fallback)).toBe('Connect it first.');
  expect(integrationError(i18n, new ApiError(502, ''), fallback)).toContain('provider refused');
  expect(integrationError(i18n, new Error('x'), fallback)).toBe(fallback);
});

test('GitHub and Bitbucket are both offered, no flag (TL-285)', () => {
  expect(GIT_PROVIDERS).toEqual(['github', 'bitbucket']);
  expect(INTEGRATION_PROVIDERS).toEqual(['bugfixes', 'github', 'bitbucket']);
  expect(connectHint(i18n)).toBe('GitHub or Bitbucket');
});
