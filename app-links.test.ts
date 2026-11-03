import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import nextConfig from './next.config';
import { config } from './proxy';

// TL-364: the files that let tracklin.es ticket and board links open the apps.
const read = (f: string) => JSON.parse(readFileSync(`public/.well-known/${f}`, 'utf8'));

test('assetlinks.json names the Android app and its Play signing and upload keys', () => {
  const [link] = read('assetlinks.json');
  expect(link.relation).toEqual(['delegate_permission/common.handle_all_urls']);
  expect(link.target.package_name).toBe('es.tracklin.android');
  expect(link.target.sha256_cert_fingerprints).toEqual(expect.arrayContaining([
    'EA:AF:68:84:FB:77:6B:76:AF:81:2E:8D:C9:3F:5E:1E:0F:F9:78:54:61:A1:29:9B:8E:05:11:7F:DA:72:05:09', // Play app signing
    'FD:28:8E:3D:00:A4:F0:B3:04:25:6B:F6:59:02:B0:65:3E:92:E6:B1:66:DC:58:0A:A4:4A:2F:F8:E2:BC:BF:AA', // upload
  ]));
  for (const f of link.target.sha256_cert_fingerprints) expect(f).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
});

test('apple-app-site-association opens tickets and boards in the iOS app, served as JSON', async () => {
  const [app] = read('apple-app-site-association').applinks.details;
  expect(app.appIDs).toEqual(['RM96X7JX9K.es.tracklin.ios']);
  expect(app.components).toEqual([{ '/': '/tickets/*' }, { '/': '/boards/*' }]);
  const rules = await nextConfig.headers!();
  expect(rules.find((r) => r.source === '/.well-known/apple-app-site-association')?.headers)
    .toEqual([{ key: 'Content-Type', value: 'application/json' }]);
});

test('the link files skip the Clerk middleware; pages still go through it', () => {
  const pages = new RegExp(`^${config.matcher[0]}$`);
  expect(pages.test('/.well-known/assetlinks.json')).toBe(false);
  expect(pages.test('/.well-known/apple-app-site-association')).toBe(false);
  for (const path of ['/tickets/TL-1', '/boards/b1', '/dashboard']) expect(pages.test(path)).toBe(true);
});
