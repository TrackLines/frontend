import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { TERMS } from '@/lib/terms';

export const metadata: Metadata = { title: 'Terms of service · Tracklines' };

export default function TermsPage() {
  return <LegalPage title="Terms of service" body={TERMS} />;
}
