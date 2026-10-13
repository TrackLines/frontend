import { expect, test } from 'bun:test';
import nextConfig from '../next.config';
import { CSP_ENFORCED, CSP_REPORT_ONLY, SECURITY_HEADERS } from './security-headers';

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value;

test('every page refuses to be framed (clickjacking), with sniffing, referrer and permissions locked down', async () => {
  expect(header('X-Frame-Options')).toBe('DENY');
  expect(CSP_ENFORCED).toContain("frame-ancestors 'none'");
  expect(header('Content-Security-Policy')).toBe(CSP_ENFORCED);
  expect(header('X-Content-Type-Options')).toBe('nosniff');
  expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  expect(header('Permissions-Policy')).toContain('camera=()');
  const rules = await nextConfig.headers!();
  expect(rules).toEqual([{ source: '/:path*', headers: SECURITY_HEADERS }]);
});

test('the content policy (report-only for now) allows what the app needs', () => {
  for (const s of ['https://clerk.tracklin.es', 'https://api.flags.gg', 'https://*.ufs.sh', 'https://utfs.io', "worker-src 'self'", "object-src 'none'"]) expect(CSP_REPORT_ONLY).toContain(s);
  expect(header('Content-Security-Policy-Report-Only')).toBe(CSP_REPORT_ONLY);
});
