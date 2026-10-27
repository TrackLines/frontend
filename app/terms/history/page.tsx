import type { Metadata } from 'next';
import { HistoryList } from '@/components/legal/legal-history';

export const metadata: Metadata = { title: 'Terms of service: every version · TrackLin.es' };

export default function History() {
  return <HistoryList doc="terms" />;
}
