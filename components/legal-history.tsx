import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/markdown';
import { legalProse } from '@/components/legal-page';
import { changes, current, DOC_TITLE, HISTORY, longDate, previousOf, versionOf, type LegalDoc } from '@/lib/legal-history';
import { cn } from '@/lib/utils';

// HistoryList: every published version of a document, newest first, each with what changed (TL-424).
export function HistoryList({ doc }: { doc: LegalDoc }) {
  const newest = current(doc).version;
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/${doc}`} className="text-sm text-muted-foreground hover:underline">← {DOC_TITLE[doc]}</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{DOC_TITLE[doc]}: every version</h1>
      <p className="mt-2 text-muted-foreground">Each version stays here exactly as it was published, with what changed from the one before.</p>
      <ol className="mt-8 divide-y rounded-xl border">
        {[...HISTORY[doc]].reverse().map((v) => (
          <li key={v.version} className="grid gap-1 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/${doc}/${v.version}`} className="font-medium hover:underline">{longDate(v.version)}</Link>
              {v.version === newest && <Badge variant="secondary">Current</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{v.summary}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}

// VersionPage: one published version, with what changed from the version before it.
export function VersionPage({ doc, version }: { doc: LegalDoc; version: string }) {
  const v = versionOf(doc, version);
  if (!v) notFound();
  const before = previousOf(doc, version);
  const diff = before ? changes(before.body, v.body).filter((c) => c.kind !== 'same') : [];
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/${doc}/history`} className="text-sm text-muted-foreground hover:underline">← Every version</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{DOC_TITLE[doc]}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Version from {longDate(v.version)}{v.version === current(doc).version ? ' (current)' : ''} · {v.summary}
      </p>
      {before && (
        <section aria-labelledby="changes" className="mt-8 grid gap-2 rounded-xl border p-4">
          <h2 id="changes" className="font-semibold">What changed since {longDate(before.version)}</h2>
          {diff.length === 0 ? <p className="text-sm text-muted-foreground">Nothing in the text.</p> : (
            <ul className="grid gap-1 text-sm" aria-label="Changes">
              {diff.map((c, i) => (
                <li key={i} className={cn('rounded px-2 py-1', c.kind === 'added' ? 'bg-emerald-500/10' : 'bg-destructive/10 text-muted-foreground line-through')}>
                  <span className="sr-only">{c.kind === 'added' ? 'Added: ' : 'Removed: '}</span>
                  <span aria-hidden className="mr-1 font-mono">{c.kind === 'added' ? '+' : '−'}</span>{c.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Markdown className={legalProse}>{v.body}</Markdown>
    </main>
  );
}
