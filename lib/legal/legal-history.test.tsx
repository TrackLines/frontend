import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { changes, current, HISTORY, longDate, previousOf, versionOf, type LegalDoc } from './legal-history';
import { TERMS } from './terms';
import { LANG_COOKIE } from '../i18n/locale';
import { THEME } from '../site/theme';
import { PRIVACY } from './privacy';
import { HistoryList, VersionPage } from '@/components/legal/legal-history';
import { LegalPage } from '@/components/legal/legal-page';
import { GET } from '@/app/legal-versions.json/route';
import { notificationHref, notificationLine } from '../work/notifications';
import { i18nFor } from '../i18n';

// PUBLISHED pins every published version's text. Published versions are never edited: a change is a
// new version (lib/legal/legal-history.ts), whose fingerprint is added here when it's published.
const PUBLISHED: Record<LegalDoc, Record<string, string>> = {
  // terms 2026-10-17: pre-launch correction (owner, 2026-10-17): "BugFix.es"
  terms: { '2026-10-17': '6caee2edf71a32e2134fb5dbdae8711c2539377823f7c227e2b3c5b4007b69a2' },
  // privacy 2026-10-17: pre-launch correction (owner, 2026-10-17): links to each provider (and ChewedFeed HQ), "Flags.gg", "BugFix.es"
  // privacy 2026-10-25: every cookie and item of device storage; what deleting your account erases (TL-595)
  // privacy 2026-10-26: ticket history and the audit log, who sees them, how long they're kept (TL-672)
  // privacy 2026-10-27: ticket history records every change, never the text of an edit (TL-682)
  privacy: {
    '2026-10-17': '953aec79535ae87943f85f5ab66e7f63d7f4fb1b6104f7dd1f2c5c46d01e6aad',
    '2026-10-25': '0b333b88d7b224e568da39770307367a172961fa1e3299db06eaacdf704fa9b6',
    '2026-10-26': '3acadb349fd15e7d93142b74348f65acb848d140287b18abb406e73f1dee95f5',
    '2026-10-27': 'd057fb3569c67ea3cb6321434db486f0dcb303320407208ea316bf8f09de7327',
  },
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
  expect(list).toEqual([{ doc: 'terms', version: '2026-10-17', summary: 'First published version.' }, { doc: 'privacy', version: '2026-10-17', summary: 'First published version.' },
    { doc: 'privacy', version: '2026-10-25', summary: 'Lists every cookie and item of device storage, and says what deleting your account erases.' },
    { doc: 'privacy', version: '2026-10-26', summary: 'Adds ticket history and the audit log on Pro and Enterprise: what they record, who can see them and how long they’re kept.' },
    { doc: 'privacy', version: '2026-10-27', summary: 'Ticket history now records every change to a ticket and who made it, never the text of an edit.' }]);
  const notice = { kind: 'legal', actor: '', text: 'We’ve updated our Terms of service (from 2026-11-20): Downtime credit now counts short outages.', ticket_id: null, ticket_key: null, board_id: null, link: '/terms/2026-11-20' };
  expect(notificationLine(i18nFor('en'), notice, [])).toBe(notice.text); // not "Someone We've updated…"
  expect(notificationHref(notice)).toBe('/terms/2026-11-20');
  expect(notificationHref({ ...notice, link: '//evil.example/x' })).toBeNull(); // only pages on this site
  expect(notificationHref({ ...notice, link: '/\\evil.example/x' })).toBeNull(); // browsers read /\ as // (audit)
});

// TL-595 (UK law audit, PECR): the policy names everything TrackLin.es keeps on a device. A new cookie
// or local storage key fails this until the policy lists it (in a new version) and the file is added here.
test('the privacy policy lists every cookie and item of device storage the code uses', async () => {
  for (const key of [LANG_COOKIE, THEME.storageKey, 'roadmap-view:', 'push-no-service', '/sw.js', '__session']) expect(PRIVACY).toContain(key);
  const storing = new Set<string>();
  for await (const file of new Bun.Glob('{app,components,lib}/**/*.{ts,tsx}').scan('.')) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const src = await Bun.file(file).text();
    if (/localStorage|sessionStorage|document\.cookie|indexedDB|cookies\(\)\.set/.test(src)) storing.add(file);
  }
  expect([...storing].sort()).toEqual(['components/layout/language-sync.tsx', 'components/roadmap/timeline.tsx', 'lib/api/index.ts', 'lib/org/push.ts']);
});

test('the policy says what the audit log holds, who sees it and how long it’s kept, as the auditor enforces (TL-672)', () => {
  const p = current('privacy').body;
  for (const s of [
    'Only your organization\'s admins can see the audit log',
    'never holds ticket content, comments, secrets or network addresses',
    'Free organizations have no audit log',
    '**The audit log** for 1 year on the Pro plan, and for as long as your organization exists on the Enterprise plan',
    '**Ticket history** for as long as the ticket exists',
    'such as tickets, comments, ticket history and audit log entries, stays with your organization',
    // TL-682: every ticket change, never the text, and not to measure people
    'Each ticket keeps a history of every change to it, who made it and when',
    'the history records that it changed, never the text',
    "it isn't used to rank or measure individuals",
  ]) expect(p).toContain(s);
});
