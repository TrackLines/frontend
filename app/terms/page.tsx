import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { TERMS } from '@/lib/legal/terms';

export const metadata: Metadata = { title: 'Terms of service · TrackLin.es' };

export default function TermsPage() {
  return <LegalPage title="Terms of service" body={TERMS} doc="terms" />;
}
