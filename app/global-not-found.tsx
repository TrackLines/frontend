import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ThemeProvider } from 'next-themes';
import { msg } from '@lingui/core/macro';
import { serverI18n, serverLocale } from '@/lib/server-i18n';
import { Geist } from 'next/font/google';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' }); // the layout's font too

export const metadata: Metadata = { title: 'Not found · TrackLin.es' };

// global-not-found: any URL that matches no route, including missing files (/apple-touch-icon….png).
// It skips the root layout, which needs Clerk's middleware, and that middleware skips file-like
// paths: rendered through the layout, a missing .png was a 500 and an error in Bugfixes (TL-298).
// So it brings its own theme (TL-585): without it a dark-mode visitor got a bright white page.
export default async function GlobalNotFound() {
  const i18n = await serverI18n();
  const locale = await serverLocale();
  const nonce = (await headers()).get('x-nonce') ?? undefined; // set when the middleware ran (the strict CSP needs it)
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html> before React hydrates
    <html lang={locale} className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider {...THEME} nonce={nonce}>
        <main className="mx-auto max-w-xl px-6 py-16">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{i18n._(msg`This page doesn’t exist`)}</h1>
          <p className="mt-2 text-muted-foreground">{i18n._(msg`The link may be old, or the address mistyped.`)}</p>
          {/* a plain link, not next/link: this page has its own <html>, and a client-side move to a page
              under the root layout did nothing (TL-586). A full page load always works, JS or not. */}
          <a href="/" className="mt-6 inline-block font-medium underline">{i18n._(msg`Go to TrackLin.es`)}</a>
        </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
