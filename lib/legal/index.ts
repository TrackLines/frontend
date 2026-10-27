// Who stands behind Tracklines, for the privacy policy, the terms and the footer (TL-203).
// UK companies must show their registered number and office on their website; keep them matching Companies House.
export const LEGAL = {
  company: 'Keloran Limited', // Companies House: KELORAN LIMITED
  tradingAs: 'ChewedFeed',
  companyNumber: '16481416',
  registeredOffice: 'Bartle House, Oxford Court, Manchester, M2 3WQ',
  contact: '/contact', // the contact form (enquiries go to ChewedFeed HQ), not an email address
  law: 'England and Wales',
  retentionDays: 30, // a deleted organization's data is purged after this (backend clerkhooks.Retention)
};

// companyLine: "Keloran Limited (trading as ChewedFeed), a company registered in England and Wales,
// company number …, registered office …", leaving out what's missing.
export function companyLine(l: typeof LEGAL = LEGAL): string {
  return [`${l.company}${l.tradingAs ? ` (trading as ${l.tradingAs})` : ''}, a company registered in ${l.law}`,
    l.companyNumber && `company number ${l.companyNumber}`, l.registeredOffice && `registered office ${l.registeredOffice}`]
    .filter(Boolean).join(', ');
}
