import { expect, test } from 'bun:test';
const { render } = await import('@/test/i18n');
const { LaunchOfferView, claimError, offerShown } = await import('./launch-offer');
const { ApiError } = await import('@/lib/api');
const { ERROR_MESSAGES } = await import('@/lib/api/error-codes');
const { i18nFor } = await import('@/lib/i18n');
import type { LaunchOffer } from '@/lib/api';

const offer = (o: Partial<LaunchOffer> = {}): LaunchOffer => ({ eligible: true, claimed: false, admin: true, trial_ends_at: null, ...o });
const clean = (s: string) => s.replace(/<!-- -->/g, '');
const view = (o: LaunchOffer, error = '') => clean(render(<LaunchOfferView offer={o} error={error} onClaim={() => {}} onCard={() => {}} />));

test('the card only shows with an offer to claim or a free year still running (TL-775)', () => {
  const now = new Date('2026-11-03T12:00:00Z');
  expect(offerShown(null, now)).toBe(false);
  expect(offerShown(offer(), now)).toBe(true);
  expect(offerShown(offer({ eligible: false }), now)).toBe(false); // not sent, or already paying
  expect(offerShown(offer({ eligible: false, claimed: true, trial_ends_at: '2027-11-03T12:00:00Z' }), now)).toBe(true);
  expect(offerShown(offer({ eligible: false, claimed: true, trial_ends_at: '2026-11-01T12:00:00Z' }), now)).toBe(false); // the year is over
});

test('admins claim it; members are told to ask an admin', () => {
  const admin = view(offer());
  expect(admin).toContain('A free year of Pro');
  expect(admin).toContain('no card needed');
  expect(admin).toContain('>Claim a free year of Pro<');
  expect(admin).not.toContain('Ask an organization admin');
  const member = view(offer({ admin: false }));
  expect(member).toContain('Ask an organization admin to claim it.');
  expect(member).not.toContain('<button');
});

test('once claimed: when it ends, and admins can add a card to keep Pro', () => {
  const claimed = view(offer({ eligible: false, claimed: true, trial_ends_at: '2027-11-03T12:00:00Z' }));
  expect(claimed).toContain('Your free year of Pro');
  expect(claimed).toContain('Pro is free until 3 November 2027');
  expect(claimed).toContain('30 days and 7 days before');
  expect(claimed).toContain('>Add a card to keep Pro<');
  expect(claimed).not.toContain('Claim a free year');
  expect(view(offer({ eligible: false, claimed: true, admin: false, trial_ends_at: '2027-11-03T12:00:00Z' }))).not.toContain('<button');
});

test('errors say what happened, and the notice can find the card', () => {
  const i18n = i18nFor('en');
  expect(claimError(i18n, new ApiError(409, 'x'))).toContain('already claimed');
  expect(claimError(i18n, new ApiError(403, 'x'))).toContain('Only organization admins');
  expect(claimError(i18n, new ApiError(404, 'x'))).toContain('isn’t available any more');
  expect(claimError(i18n, new Error('offline'))).toContain('Please try again');
  const html = view(offer(), 'Couldn’t claim the free year. Please try again.');
  expect(html).toContain('role="alert"');
  expect(html).toContain('id="launch-offer"');
  for (const code of ['launch_offer_claimed', 'launch_offer_unavailable']) expect(ERROR_MESSAGES[code]).toBeDefined();
});
