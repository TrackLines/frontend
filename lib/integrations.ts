import { ApiError } from './api';

export const PROVIDER_NAMES = { bugfixes: 'Bugfixes', github: 'GitHub', bitbucket: 'Bitbucket' } as const;

// integrationError says what went wrong connecting or linking, in words an admin can act on.
export function integrationError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  switch (err.status) {
    case 403: return 'Only organization admins can manage integrations.';
    case 503: return 'Integrations aren’t set up on this server yet (see docs/integrations.md).';
    case 400: return err.message.includes('expired') || err.message.includes('organization')
      ? 'This connect link expired or was for another organization. Start again.'
      : err.message;
    case 409: return err.message === 'not connected' ? 'Connect it first.' : err.message;
    case 502: return 'The provider refused or couldn’t be reached. Try again.';
    default: return fallback;
  }
}
