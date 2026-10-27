'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { CopyIcon, DownloadIcon, FileTextIcon, PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { reports } from '@/lib/api';
import type { Range, Scope } from '@/lib/sprint/sprint-report';
import { dates } from '@/lib/i18n';

// markdownFile: the download's name, as the server names it: "backend-sprints-2026-08-01-to-2026-09-30.md".
export function markdownFile(name: string, range: Range): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
  return `${slug}-sprints-${range.from}-to-${range.to}.md`;
}

// ExportMenu: a sprint report as a presentation PDF (the browser's print, landscape: TL-401), or as
// Markdown (the server's, TL-399), downloaded or copied.
export function ExportMenu({ scope, range, name, token }: { scope: Scope; range: Range; name: string; token: string }) {
  return <Export markdown={() => reports.markdown(scope, range, token)} file={markdownFile(name, range)} />;
}

// Export: any report's menu: PDF by printing the page, Markdown from markdown() saved as file or copied.
export function Export({ markdown: get, file }: { markdown: () => Promise<string>; file: string }) {
  const { t } = useLingui();
  const [status, setStatus] = useState('');
  async function markdown(then: (text: string) => Promise<void> | void, done: string) {
    setStatus('');
    try {
      await then(await get());
      setStatus(done);
    } catch {
      setStatus(t`Couldn’t get the Markdown. Please try again.`);
    }
  }
  return (
    <div className="flex items-center gap-2 print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}><DownloadIcon /><Trans>Export</Trans></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.print()}><PrinterIcon /><Trans>Save as PDF (presentation)</Trans></DropdownMenuItem>
          <DropdownMenuItem onClick={() => void markdown((text) => {
            const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
            const a = Object.assign(document.createElement('a'), { href: url, download: file });
            a.click();
            URL.revokeObjectURL(url);
          }, t`Downloaded.`)}><FileTextIcon /><Trans>Download Markdown</Trans></DropdownMenuItem>
          <DropdownMenuItem onClick={() => void markdown((text) => navigator.clipboard.writeText(text), t`Copied as Markdown.`)}><CopyIcon /><Trans>Copy as Markdown</Trans></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {status && <span role="status" className="text-xs text-muted-foreground">{status}</span>}
    </div>
  );
}

// PrintCover: the PDF's first page, only in print: the logo, what the report covers and when it was made.
export function PrintCover({ title, kind, range, heading, generated = new Date() }: { title: string; kind: string; range: Range; heading?: string; generated?: Date }) {
  const { i18n } = useLingui();
  const when = dates(i18n, { dateStyle: 'long', timeStyle: 'short' }).format(generated);
  return (
    <section className="hidden min-h-[80vh] flex-col justify-center gap-6 break-after-page print:flex" data-print-cover>
      {/* eslint-disable-next-line @next/next/no-img-element -- a plain img prints reliably */}
      <img src="/logo-tile.png" alt="TrackLin.es" width={56} height={56} className="size-14 rounded-xl" />
      <div>
        <p className="text-sm font-bold tracking-[.14em] uppercase">{heading ?? <Trans>Sprint report · {kind}</Trans>}</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">{title}</h1>
      </div>
      <p className="text-lg"><Trans>{range.from} to {range.to}</Trans></p>
      <p className="text-sm text-muted-foreground"><Trans>Generated {when} by TrackLin.es</Trans></p>
    </section>
  );
}
