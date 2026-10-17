import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEGAL, companyLine } from './legal';
import { PRIVACY } from './privacy';
import { TERMS } from './terms';
import { LegalPage } from '@/components/legal-page';
import { SiteFooter } from '@/components/site-footer';

test('who runs Tracklines: the company, its trading name, number and (once registered) office', () => {
  expect(companyLine()).toContain('Keloran Limited (trading as ChewedFeed), a company registered in England and Wales, company number 16481416');
  expect(companyLine({ ...LEGAL, registeredOffice: '1 High St, London' }))
    .toBe('Keloran Limited (trading as ChewedFeed), a company registered in England and Wales, company number 16481416, registered office 1 High St, London');
  expect(companyLine({ ...LEGAL, tradingAs: '', companyNumber: '', registeredOffice: '' })).toBe('Keloran Limited, a company registered in England and Wales');
});

test('the privacy policy makes the promises the product keeps', () => {
  for (const s of [
    'We don\'t sell your data', 'we don\'t run analytics or tracking scripts',
    'Delete a ticket and it goes, with its comments and attachments, 30 days later', 'otherwise it\'s deleted at 13 months', '30 days', 'encrypted with a key that\'s kept outside the database', 'one-way hash',
    'Keloran Limited', 'UK GDPR', 'ico.org.uk', 'Clerk', 'Stripe', 'UploadThing', 'Railway', 'ChewedFeed HQ', '[contact form](/contact)',
  ]) expect(PRIVACY).toContain(s);
});

test('nothing points people at an email address: questions go through the contact form', () => {
  for (const text of [PRIVACY, TERMS, renderToStaticMarkup(<SiteFooter />)]) {
    expect(text).not.toContain('mailto:');
    expect(text).not.toMatch(/[\w.]+@tracklin\.es/);
  }
});

test('the terms match the plans and the deletion policy', () => {
  for (const s of ['one project', 'We don\'t give refunds for part-used months', 'cancel any time', '30 days',
    'England and Wales', 'death or personal injury', '£100', 'An API key acts as you']) expect(TERMS).toContain(s);
});

test('legal pages render their markdown; the footer links them from every page', () => {
  const page = renderToStaticMarkup(<LegalPage title="Terms of service" body={TERMS} doc="terms" />);
  expect(page).toContain('<h1');
  expect(page).toContain('<h2>1. Your account</h2>');
  expect(page).toContain('Last updated 17 October 2026');
  const footer = renderToStaticMarkup(<SiteFooter />);
  for (const s of ['href="/privacy"', 'href="/terms"', 'href="/contact"', 'Keloran Limited', '16481416']) expect(footer).toContain(s);
});

test('the privacy policy covers Google Calendar: what’s read, only when, never titles, how long (TL-411)', async () => {
  const { PRIVACY } = await import('./privacy');
  for (const s of ['**Google Calendar.**', 'Out of office', 'only **when** someone is away', "never store an event's title", "Google gives us the dates of Out of office events",
    '**Time away from Google Calendar**', 'leave that ended over a week ago is deleted', 'disconnects Google Calendar', "your organization's and our legitimate interests"]) {
    expect(PRIVACY).toContain(s);
  }
});

test('the Terms state the plans and the price promise (owner, 2026-10-17)', async () => {
  const { TERMS } = await import('./terms');
  for (const s of ['one project and up to 20 members', 'five projects and up to 20 members', 'unlimited projects and unlimited members', 'AI agents connected with API keys aren\'t members',
    'at least 30 days before the new price takes effect', 'you keep paying your current price for 3 months after it does', 'remind you again 30 days before your own price goes up', 'added to, or taken off, your next bill']) {
    expect(TERMS).toContain(s);
  }
  expect(TERMS).not.toContain('$10 a month'); // prices come from Stripe, not the Terms
  expect(TERMS).not.toContain('unlimited projects. It');
});

test('the Terms promise downtime credit: over an hour, every UTC day it touched free, no maintenance exception (owner, 2026-10-17)', async () => {
  const { TERMS } = await import('./terms');
  for (const s of ['down for more than an hour in one go', 'https://uptime.chewedfeed.com/status/tracklines', 'every paying organization gets each day the outage touched free',
    'off your next bill for each of those days', 'starts before midnight and carries on after it gives you both days', 'Several shorter outages close together are looked at case by case, and we\'ll usually treat them the same way', 'there\'s no maintenance exception']) {
    expect(TERMS).toContain(s);
  }
});

test('the privacy policy links each provider to its own site, and spells Flags.gg and BugFix.es their way (owner, 2026-10-17)', async () => {
  const { PRIVACY } = await import('./privacy');
  for (const s of ['[Railway](https://railway.com)', '[Clerk](https://clerk.com)', '[Stripe](https://stripe.com)', '[UploadThing](https://uploadthing.com)',
    '[Google](https://workspace.google.com)', '[Flags.gg](https://flags.gg)', '[BugFix.es](https://bugfix.es)', '[ChewedFeed HQ](https://chewedfeed.com)']) expect(PRIVACY).toContain(s);
  expect(PRIVACY).not.toMatch(/(^|[^/])flags\.gg(?!\))/);
  expect(PRIVACY).not.toContain('Bugfixes');
  expect((await import('./terms')).TERMS).not.toContain('Bugfixes');
});
