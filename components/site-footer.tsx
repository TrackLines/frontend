import Link from 'next/link';
import { LEGAL, companyLine } from '@/lib/legal';

// SiteFooter: on every page: who runs Tracklines and the legal pages.
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-6 py-6 text-xs text-muted-foreground">
      <p>Tracklines is run by {companyLine()}.</p>
      <nav aria-label="Legal" className="flex gap-4">
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
        <a href={`mailto:${LEGAL.contact}`} className="hover:text-foreground hover:underline">Contact</a>
      </nav>
    </footer>
  );
}
