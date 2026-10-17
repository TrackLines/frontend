import type { Metadata } from 'next';
import { VersionPage } from '@/components/legal-history';
import { HISTORY } from '@/lib/legal-history';

export const metadata: Metadata = { title: 'Terms of service (earlier version) · TrackLin.es' };
export const dynamicParams = false; // only published versions
export const generateStaticParams = () => HISTORY.terms.map((v) => ({ version: v.version }));

export default async function Version({ params }: { params: Promise<{ version: string }> }) {
  return <VersionPage doc="terms" version={(await params).version} />;
}
