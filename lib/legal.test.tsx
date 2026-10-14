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
  for (const s of ['$10 a month', 'one project', 'We don\'t give refunds for part-used months', 'cancel any time', '30 days',
    'England and Wales', 'death or personal injury', '£100', 'An API key acts as you']) expect(TERMS).toContain(s);
});

test('legal pages render their markdown; the footer links them from every page', () => {
  const page = renderToStaticMarkup(<LegalPage title="Terms of service" body={TERMS} />);
  expect(page).toContain('<h1');
  expect(page).toContain('<h2>1. Your account</h2>');
  expect(page).toContain('Last updated 13 October 2026');
  const footer = renderToStaticMarkup(<SiteFooter />);
  for (const s of ['href="/privacy"', 'href="/terms"', 'href="/contact"', 'Keloran Limited', '16481416']) expect(footer).toContain(s);
});
