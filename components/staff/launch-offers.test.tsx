import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
mockDialog();
const { render } = await import('@/test/i18n');
const { LaunchOffersView, selectable, statusDetail } = await import('./launch-offers');
const { StaffFrame } = await import('./staff-shell');
const { i18nFor } = await import('@/lib/i18n');
import type { OfferOrg } from '@/lib/api';

const org = (o: Partial<OfferOrg> = {}): OfferOrg => ({
  org_id: 'org_new', name: 'New Co', created_at: '2026-11-01T10:00:00Z', members: 3, plan: 'free', status: 'not_sent',
  offered_at: null, claimed_at: null, claimed_by: null, trial_ends_at: null, last_active: null, ...o,
});
const orgs: OfferOrg[] = [
  org(),
  org({ org_id: 'org_paid', name: 'Paying Ltd', plan: 'pro', status: 'paid', last_active: '2026-11-10T09:00:00Z' }),
  org({ org_id: 'org_sent', name: 'Sent Inc', status: 'sent', offered_at: '2026-11-02T09:00:00Z' }),
  org({ org_id: 'org_claimed', name: 'Claimed plc', plan: 'pro', status: 'claimed', offered_at: '2026-11-02T09:00:00Z', claimed_at: '2026-11-03T09:00:00Z', claimed_by: 'user_a', trial_ends_at: '2027-11-03T09:00:00Z' }),
  org({ org_id: 'org_conv', name: 'Converted', plan: 'pro', status: 'converted', claimed_at: '2025-11-03T09:00:00Z' }),
  org({ org_id: 'org_ended', name: 'Ended', status: 'ended', claimed_at: '2025-11-03T09:00:00Z' }),
];
const clean = (s: string) => s.replace(/<!-- -->/g, '');
const send = async () => ({ sent: [], skipped: [] });
const view = (p: Partial<Parameters<typeof LaunchOffersView>[0]> = {}) => clean(render(<LaunchOffersView orgs={orgs} flagOn onSend={send} {...p} />));

test('every organization: name, created date, members, plan and where it is with the offer (TL-779)', () => {
  const html = view();
  for (const s of ['New Co', 'org_new', '1 Nov 2026', 'Paying Ltd', 'Already paying', 'Sent Inc', 'on 2 Nov 2026', 'Claimed plc', 'Claimed',
    'on 3 Nov 2026, free until 3 Nov 2027', 'Now paying', 'Ended', 'claimed on 3 Nov 2025', 'Not sent']) expect(html).toContain(s);
  expect(html).toContain('data-status="claimed"');
});

test('shows when each organization was last active, or never', () => {
  const html = view();
  expect(html).toContain('Last active');
  expect(html).toContain('10 Nov 2026');
  expect(html).toContain('Never');
});

test('only orgs not yet sent and not paying can be picked', () => {
  expect(orgs.filter(selectable).map((o) => o.org_id)).toEqual(['org_new']);
  const html = view();
  // one enabled row checkbox (New Co) plus select all; the rest are disabled
  expect(html.match(/aria-label="Select [^"]+"/g)?.length).toBe(orgs.length + 1);
  expect(html).toContain('Send offer to 0 organizations');
  const i18n = i18nFor('en');
  expect(statusDetail(i18n, orgs[0])).toBe('');
  expect(statusDetail(i18n, orgs[2])).toBe('on 2 Nov 2026');
});

test('sending asks first and lists who gets it; a picked org that can’t be sent is left out', () => {
  const html = view({ initialSelected: ['org_new', 'org_paid'], initialConfirming: true });
  expect(html).toContain('Send offer to 1 organization');
  expect(html).toContain('role="dialog"');
  expect(html).toContain('Send the offer to 1 organization?');
  expect(html).toContain('can’t be undone');
  expect(html).toContain('>Send it<');
  const dialog = html.slice(html.indexOf('role="dialog"'));
  expect(dialog).toContain('New Co');
  expect(dialog).not.toContain('Paying Ltd');
});

test('with the flag off nothing can be sent; results say what was skipped', () => {
  const off = view({ flagOn: false, initialSelected: ['org_new'] });
  expect(off).toContain('The launch-offer flag is off');
  expect(off).toMatch(/<button[^>]*disabled[^>]*>Send offer to 1 organization/);
  const done = view({ initialResult: { sent: ['org_new'], skipped: [{ org_id: 'org_sent', reason: 'already_sent' }, { org_id: 'org_x', reason: 'failed' }] } });
  expect(done).toContain('Sent to 1 organizations.');
  expect(done).toContain('Sent Inc: already sent');
  expect(done).toContain('org_x: failed, try again');
});

test('the admin panel has a Launch offer tab', () => {
  const html = clean(render(<StaffFrame tab="launch-offer"><p>x</p></StaffFrame>));
  expect(html).toContain('href="/staff/launch-offer"');
  expect(html).toMatch(/aria-current="page"[^>]*>Launch offer</);
});
