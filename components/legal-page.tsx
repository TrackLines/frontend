import { Markdown } from '@/components/markdown';
import { LEGAL } from '@/lib/legal';

// LegalPage: the privacy policy and terms share one readable layout.
export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {LEGAL.updated}</p>
      <Markdown className="legal mt-8 grid gap-4 leading-7 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_a]:underline">{body}</Markdown>
    </main>
  );
}
