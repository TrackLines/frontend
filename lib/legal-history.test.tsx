import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { changes, current, HISTORY, longDate, previousOf, versionOf, type LegalDoc } from './legal-history';
import { TERMS } from './terms';
import { PRIVACY } from './privacy';
import { HistoryList, VersionPage } from '@/components/legal-history';
import { LegalPage } from '@/components/legal-page';
import { GET } from '@/app/legal-versions.json/route';
import { notificationHref, notificationLine } from './notifications';
import { i18nFor } from './i18n';

// PUBLISHED pins every published version's text. Published versions are never edited: a change is a
// new version (lib/legal-history.ts), whose fingerprint is added here when it's published.
const PUBLISHED: Record<LegalDoc, Record<string, string>> = {
  // terms 2026-10-17: pre-launch correction (owner, 2026-10-17): "BugFix.es"
  terms: { '2026-10-17': '6caee2edf71a32e2134fb5dbdae8711c2539377823f7c227e2b3c5b4007b69a2' },
  // privacy 2026-10-17: pre-launch correction (owner, 2026-10-17): links to each provider (and ChewedFeed HQ), "Flags.gg", "BugFix.es"
  privacy: { '2026-10-17': '953aec79535ae87943f85f5ab66e7f63d7f4fb1b6104f7dd1f2c5c46d01e6aad' },
};
const sha = (s: string) => new Bun.CryptoHasher('sha256').update(s).digest('hex');

test('published versions never change; the live pages are the newest; versions are in date order (TL-424)', () => {
  for (const doc of ['terms', 'privacy'] as LegalDoc[]) {
    const versions = HISTORY[doc];
    expect(versions.map((v) => v.version)).toEqual(Object.keys(PUBLISHED[doc])); // every version pinned, oldest first
    for (const v of versions) {
      expect(sha(v.body)).toBe(PUBLISHED[doc][v.version]);
      expect(v.summary.length).toBeGreaterThan(0);
    }
    expect([...versions.map((v) => v.version)].sort()).toEqual(versions.map((v) => v.version));
  }
  expect(TERMS).toBe(current('terms').body);
  expect(PRIVACY).toBe(current('privacy').body);
  expect(longDate('2026-10-17')).toBe('17 October 2026');
  expect(versionOf('terms', '2026-10-17')).not.toBeNull();
  expect(versionOf('terms', '2099-01-01')).toBeNull();
  expect(previousOf('terms', '2026-10-17')).toBeNull();
});

test('what changed: added and removed paragraphs, the rest kept', () => {
  const before = '## Plans\n- **Free** includes one project.\n- **Pro** costs $10 a month.\n\nCancel any time.';
  const after = '## Plans\n- **Free** includes one project and up to 20 members.\n- **Pro** costs $10 a month.\n\nCancel any time.\n- **Downtime credit:** new.';
  expect(changes(before, after)).toEqual([
    { kind: 'same', text: '## Plans' },
    { kind: 'removed', text: '- **Free** includes one project.' },
    { kind: 'added', text: '- **Free** includes one project and up to 20 members.' },
    { kind: 'same', text: '- **Pro** costs $10 a month.' },
    { kind: 'same', text: 'Cancel any time.' },
    { kind: 'added', text: '- **Downtime credit:** new.' },
  ]);
  expect(changes('a', 'a')).toEqual([{ kind: 'same', text: 'a' }]);
});

test('the pages: Last updated links to every version; each version shows itself and what changed', () => {
  const live = renderToStaticMarkup(<LegalPage title="Terms of service" body={TERMS} doc="terms" />);
  expect(live).toContain('Last updated 17 October 2026');
  expect(live).toContain('href="/terms/history"');
  const list = renderToStaticMarkup(<HistoryList doc="privacy" />);
  expect(list).toContain('href="/privacy/2026-10-17"');
  expect(list).toContain('Current');
  expect(list).toContain('First published version.');
  const page = renderToStaticMarkup(<VersionPage doc="terms" version="2026-10-17" />);
  expect(page).toContain('Version from 17 October 2026 (current)');
  expect(page).not.toContain('What changed since'); // the first version has nothing before it
  expect(page).toContain('Plans and payment');
});

test('the backend’s list of versions, and the bell’s notice', async () => {
  const list = await GET().json();
  expect(list).toEqual([{ doc: 'terms', version: '2026-10-17', summary: 'First published version.' }, { doc: 'privacy', version: '2026-10-17', summary: 'First published version.' }]);
  const notice = { kind: 'legal', actor: '', text: 'We’ve updated our Terms of service (from 2026-11-20): Downtime credit now counts short outages.', ticket_id: null, ticket_key: null, board_id: null, link: '/terms/2026-11-20' };
  expect(notificationLine(i18nFor('en'), notice, [])).toBe(notice.text); // not "Someone We've updated…"
  expect(notificationHref(notice)).toBe('/terms/2026-11-20');
  expect(notificationHref({ ...notice, link: '//evil.example/x' })).toBeNull(); // only pages on this site
  expect(notificationHref({ ...notice, link: '/\\evil.example/x' })).toBeNull(); // browsers read /\ as // (audit)
});
