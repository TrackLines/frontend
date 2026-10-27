import Link from 'next/link';
import { Markdown } from '@/components/common/markdown';
import { current, longDate, type LegalDoc } from '@/lib/legal/legal-history';

export const legalProse = 'legal mt-8 grid gap-4 leading-7 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_a]:underline';

// LegalPage: the privacy policy and terms share one readable layout. The date is the newest published
// version's, and links to every earlier version and what changed (TL-424).
export function LegalPage({ title, body, doc }: { title: string; body: string; doc: LegalDoc }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated {longDate(current(doc).version)} · <Link href={`/${doc}/history`} className="underline">Earlier versions and what changed</Link>
      </p>
      <Markdown className={legalProse}>{body}</Markdown>
    </main>
  );
}
