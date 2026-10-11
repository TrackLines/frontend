import type { Metadata } from 'next';
import { RequestPage } from '@/components/intake/request-form';

// Public and unlisted: no account, nothing about the project, not indexed.
export const metadata: Metadata = { title: 'Send a request', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <RequestPage token={token} />
    </main>
  );
}
