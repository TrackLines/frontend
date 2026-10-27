import { expect, test } from 'bun:test';
import nextConfig from '../../next.config';
import { CSP_DIRECTIVES, SECURITY_HEADERS } from './security-headers';

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value;

test('static security headers lock down framing, sniffing, referrer and permissions', async () => {
  expect(header('X-Frame-Options')).toBe('DENY');
  expect(header('X-Content-Type-Options')).toBe('nosniff');
  expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  expect(header('Permissions-Policy')).toContain('camera=()');
  const rules = await nextConfig.headers!();
  expect(rules).toEqual([{ source: '/:path*', headers: SECURITY_HEADERS }]);
});

test('strict CSP directives allow the app integrations and deny framing and plugins', () => {
  expect(CSP_DIRECTIVES['connect-src']).toEqual(expect.arrayContaining([
    'https://clerk.tracklin.es',
    'https://*.clerk.accounts.dev',
    'https://api.flags.gg',
    'https://utfs.io',
    'https://*.ufs.sh',
    'https://*.uploadthing.com',
    'https://api.uploadthing.com',
  ]));
  expect(CSP_DIRECTIVES['img-src']).toEqual(expect.arrayContaining([
    'data:', 'blob:', 'https://img.clerk.com', 'https://utfs.io', 'https://*.ufs.sh',
  ]));
  expect(CSP_DIRECTIVES['frame-ancestors']).toEqual(['none']);
  expect(CSP_DIRECTIVES['object-src']).toEqual(['none']);
  expect(SECURITY_HEADERS.some(({ key }) => key.startsWith('Content-Security-Policy'))).toBe(false);
});
