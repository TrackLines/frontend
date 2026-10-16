import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { PRIVACY } from '@/lib/privacy';

export const metadata: Metadata = { title: 'Privacy policy · TrackLin.es' };

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" body={PRIVACY} />;
}
