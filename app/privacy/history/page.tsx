import type { Metadata } from 'next';
import { HistoryList } from '@/components/legal-history';

export const metadata: Metadata = { title: 'Privacy policy: every version · TrackLin.es' };

export default function History() {
  return <HistoryList doc="privacy" />;
}
