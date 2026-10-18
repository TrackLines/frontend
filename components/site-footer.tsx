import Link from 'next/link';
import { LEGAL, companyLine } from '@/lib/legal';

// SiteFooter: on every page: who runs TrackLin.es on the left, the docs and legal pages pinned to the
// right (stacked on phones).
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 grid max-w-6xl gap-4 border-t px-6 py-6 text-xs text-muted-foreground sm:grid-cols-[1fr_auto] sm:gap-12 print:hidden">
      <p className="max-w-xl leading-relaxed">TrackLin.es is run by {companyLine()}.</p>
      <nav aria-label="Docs and legal" className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end sm:self-start">
        <Link href="/docs" className="hover:text-foreground hover:underline">Docs</Link>
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
        <Link href={LEGAL.contact} className="hover:text-foreground hover:underline">Contact</Link>
      </nav>
    </footer>
  );
}
