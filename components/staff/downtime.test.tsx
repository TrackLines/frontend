import { afterEach, expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
mockDialog();
const { render } = await import('@/test/i18n');
const { CreditsView, OutageList, fromUTCInput, toCredit } = await import('./downtime');
const { staff } = await import('@/lib/api');
const { notificationLine } = await import('@/lib/notifications');
const { i18nFor } = await import('@/lib/i18n');
import type { CreditPreview, DowntimeCredit, Outage } from '@/lib/api';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const outage = (o: Partial<Outage> = {}): Outage => ({
  id: 'o1', starts_at: '2026-10-17T23:00:00Z', ends_at: '2026-10-18T00:30:00Z', note: 'db failover', minutes: 90, qualifies: true,
  days: ['2026-10-17', '2026-10-18'], clusters: [], credited: 0, ...o,
});
const line = (org: string, day: string, credited = false, amount = 100): DowntimeCredit => ({ org_id: org, plan: 'pro', day, amount, currency: 'gbp', credited });
const clean = (s: string) => s.replace(/<!-- -->/g, '');

test('UTC times from the form, and what is left to credit (TL-580)', () => {
  expect(fromUTCInput('2026-10-17T23:05')).toBe('2026-10-17T23:05:00Z');
  expect(fromUTCInput('')).toBe('');
  const due = toCredit([line('a', '2026-10-17'), line('a', '2026-10-18'), line('b', '2026-10-17', true), line('c', '2026-10-17', false, 250)]);
  expect(due.orgs).toBe(2);
  expect(due.totals).toEqual({ gbp: 450 });
  expect(due.lines.length).toBe(3);
});

test('the list says which outages qualify and flags clusters', () => {
  const html = clean(render(<OutageList token="t" open={null} onOpen={() => {}} onDelete={() => {}} list={[
    outage({ credited: 4 }),
    outage({ id: 'o2', starts_at: '2026-10-20T10:00:00Z', ends_at: '2026-10-20T10:20:00Z', minutes: 20, qualifies: false, days: ['2026-10-20'], clusters: ['2026-10-20'], note: '' }),
  ]} />));
  for (const s of ['17 Oct 2026, 23:00', 'db failover', '1 h 30 min', 'Over an hour: credited', '20 min', 'An hour or less', 'Cluster on 20 Oct 2026: you decide']) expect(html).toContain(s);
  expect(html.split('>Delete<').length - 1).toBe(1); // the credited one stays
});

const preview = (o: Partial<CreditPreview> = {}): CreditPreview => ({
  outage: outage(), credits: [line('org_a', '2026-10-17'), line('org_a', '2026-10-18'), line('org_b', '2026-10-17', true)],
  problems: [{ org_id: 'org_x', error: 'no such subscription' }], ...o,
});

test('the preview: each org and day, already-credited days greyed, problems listed', () => {
  const html = clean(render(<CreditsView preview={preview()} result={null} onApply={async () => {}} />));
  for (const s of ['Credits for 17 Oct 2026, 18 Oct 2026', 'org_a', '£1.00', '(already credited)', 'data-credited="true"', 'org_x', 'no such subscription', 'Apply credits', '1 organizations, £2.00 in total']) {
    expect(html).toContain(s);
  }
  expect(html).not.toContain('role="dialog"');
});

test('applying asks first: how many organizations and how much', () => {
  const html = clean(render(<CreditsView preview={preview()} result={null} onApply={async () => {}} confirming />));
  expect(html).toContain('role="dialog"');
  expect(html).toContain('Credit 1 organizations £2.00 in total?');
  expect(html).toContain('Credit them');
});

test('a short outage is only offered for crediting as part of a cluster; results show failures', () => {
  const short = outage({ qualifies: false, minutes: 20 });
  expect(clean(render(<CreditsView preview={preview({ outage: short })} result={null} onApply={async () => {}} />))).not.toContain('Apply credits');
  const cluster = clean(render(<CreditsView preview={preview({ outage: { ...short, clusters: ['2026-10-17'] } })} result={null} onApply={async () => {}} />));
  expect(cluster).toContain('part of a cluster');
  expect(cluster).toContain('Apply credits');
  const done = clean(render(<CreditsView preview={preview()} onApply={async () => {}} result={{ credited: [line('org_a', '2026-10-17')], problems: [{ org_id: 'org_d', error: '2026-10-18: card_declined' }] }} />));
  expect(done).toContain('Credited 1 organization-days.');
  expect(done).toContain('apply again to retry them');
  expect(done).toContain('card_declined');
});

test('the calls, and the credit notification reads as from TrackLin.es', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await staff.outages('t');
  await staff.addOutage({ starts_at: '2026-10-17T23:00:00Z', ends_at: '2026-10-18T00:30:00Z', note: 'x' }, 't');
  await staff.previewCredits('o1', 't');
  await staff.applyCredits('o1', true, 't');
  await staff.deleteOutage('o1', 't');
  expect(asked).toEqual(['GET /staff/outages', 'POST /staff/outages {"starts_at":"2026-10-17T23:00:00Z","ends_at":"2026-10-18T00:30:00Z","note":"x"}',
    'GET /staff/outages/o1/preview', 'POST /staff/outages/o1/apply {"include_short":true}', 'DELETE /staff/outages/o1']);
  expect(notificationLine(i18nFor('en'), { kind: 'downtime_credit', actor: '', text: 'credited 17 and 18 Oct for downtime: those days are free on your next bill' }, []))
    .toBe('TrackLin.es credited 17 and 18 Oct for downtime: those days are free on your next bill');
});
