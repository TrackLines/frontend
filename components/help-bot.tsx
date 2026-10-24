'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFlags } from '@flags-gg/react-library';
import { Trans, useLingui } from '@lingui/react/macro';
import { CircleHelpIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HELP, hrefFor, search, suggestions } from '@/lib/help';

// HelpBot: a "?" bottom right on signed-in pages, with short answers to common questions (TL-569),
// behind the help-bot flag. No AI: the answers are written in lib/help.ts.
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
        <HelpAnswers query={query} pathname={pathname} />
      </PopoverContent>
    </Popover>
  );
}

// HelpAnswers: what matches the search, or, before you type, the answers for this page (pure, for tests).
export function HelpAnswers({ query, pathname }: { query: string; pathname: string }) {
  const { i18n } = useLingui();
  const found = query.trim() ? search(i18n, HELP, query) : suggestions(HELP, pathname);
  if (found.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        <Trans>Nothing about that yet. Try the <Link href="/docs" className="underline">docs</Link>, or <Link href="/contact" className="underline">ask us</Link>.</Trans>
      </p>
    );
  }
  return (
    <ul className="grid max-h-80 gap-3 overflow-y-auto">
      {found.map((e) => (
        <li key={e.id} className="grid gap-1 text-sm">
          <p className="font-medium">{i18n._(e.q)}</p>
          <p className="text-muted-foreground">{i18n._(e.a)}</p>
          {e.href && <Link href={hrefFor(e, pathname)} className="text-sm font-medium underline-offset-4 hover:underline"><Trans>Take me there →</Trans></Link>}
        </li>
      ))}
    </ul>
  );
}
