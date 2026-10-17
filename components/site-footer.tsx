import Link from 'next/link';
import { LEGAL, companyLine } from '@/lib/legal';

// SiteFooter: on every page: who runs TrackLin.es, the docs and the legal pages.
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 flex max-w-6xl print:hidden flex-wrap items-center justify-between gap-3 border-t px-6 py-6 text-xs text-muted-foreground">
      <p>TrackLin.es is run by {companyLine()}.</p>
      <nav aria-label="Docs and legal" className="flex gap-4">
        <Link href="/docs" className="hover:text-foreground hover:underline">Docs</Link>
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
        <Link href={LEGAL.contact} className="hover:text-foreground hover:underline">Contact</Link>
      </nav>
    </footer>
  );
}
