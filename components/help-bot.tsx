'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFlags } from '@flags-gg/react-library';
import { Trans, useLingui } from '@lingui/react/macro';
import { CircleHelpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { help } from '@/lib/api';
import { hrefFor, search, suggestions, type HelpEntry } from '@/lib/help';
import { useToken } from '@/lib/use-token';

// HelpBot: a "?" bottom right on signed-in pages, with short answers to common questions (TL-569),
// behind the help-bot flag. No AI: staff write the answers in the admin panel (TL-579).
export function HelpBot() {
  const { is } = useFlags();
  const { t } = useLingui();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  if (!is('help-bot').enabled()) return null;
  return (
    <Popover>
      <PopoverTrigger render={
        <Button type="button" size="icon" variant="outline" aria-label={t`Help`} title={t`Help`}
          className="fixed right-4 bottom-4 z-40 rounded-full shadow-md print:hidden" />
      }>
        <CircleHelpIcon />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-3 p-3">
        <p className="font-medium"><Trans>How can we help?</Trans></p>
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t`e.g. add a board`} aria-label={t`Search help`} />
        <LoadedAnswers query={query} pathname={pathname} />
      </PopoverContent>
    </Popover>
  );
}

// the answers, fetched once a page load per language (the panel opens often; they change rarely)
const loaded = new Map<string, Promise<HelpEntry[]>>();

// LoadedAnswers: the answers in your language, from the API, once the panel opens.
function LoadedAnswers({ query, pathname }: { query: string; pathname: string }) {
  const { i18n } = useLingui();
  const token = useToken();
  const [entries, setEntries] = useState<HelpEntry[] | null | 'failed'>(null);
  useEffect(() => {
    if (!token) return;
    let p = loaded.get(i18n.locale);
    if (!p) {
      p = help.list(i18n.locale, token);
      loaded.set(i18n.locale, p);
      p.catch(() => loaded.delete(i18n.locale)); // try again next time
    }
    p.then(setEntries, () => setEntries('failed'));
  }, [token !== null, i18n.locale]);
  if (entries === 'failed') return <p role="alert" className="text-sm text-muted-foreground"><Trans>Help couldn’t load. Try the <Link href="/docs" className="underline">docs</Link>.</Trans></p>;
  if (entries === null) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>;
  return <HelpAnswers entries={entries} query={query} pathname={pathname} />;
}

// HelpAnswers: what matches the search, or, before you type, the answers for this page (pure, for tests).
export function HelpAnswers({ entries, query, pathname }: { entries: HelpEntry[]; query: string; pathname: string }) {
  const found = query.trim() ? search(entries, query) : suggestions(entries, pathname);
  if (found.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        <Trans>Nothing about that yet. Try the <Link href="/docs" className="underline">docs</Link>, or <Link href="/contact" className="underline">ask us</Link>.</Trans>
      </p>
    );
  }
  return (
    <ul className="grid max-h-80 gap-3 overflow-y-auto">
      {found.map((e) => <li key={e.slug}><HelpItem entry={e} pathname={pathname} /></li>)}
    </ul>
  );
}

// HelpItem: one answer as the panel shows it (the admin panel previews with it too).
export function HelpItem({ entry, pathname }: { entry: Pick<HelpEntry, 'question' | 'answer' | 'href' | 'fallback_href'>; pathname: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <p className="font-medium">{entry.question}</p>
      <p className="text-muted-foreground">{entry.answer}</p>
      {entry.href && <Link href={hrefFor(entry, pathname)} className="text-sm font-medium underline-offset-4 hover:underline"><Trans>Take me there →</Trans></Link>}
    </div>
  );
}
