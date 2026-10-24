import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { msg } from '@lingui/core/macro';
import { serverI18n } from '@/lib/server-i18n';

export const metadata: Metadata = { title: 'Not found · TrackLin.es' };

// global-not-found: any URL that matches no route, including missing files (/apple-touch-icon….png).
// It skips the root layout, which needs Clerk's middleware, and that middleware skips file-like
// paths: rendered through the layout, a missing .png was a 500 and an error in Bugfixes (TL-298).
export default async function GlobalNotFound() {
  const i18n = await serverI18n();
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="mx-auto max-w-xl px-6 py-16">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{i18n._(msg`This page doesn’t exist`)}</h1>
          <p className="mt-2 text-muted-foreground">{i18n._(msg`The link may be old, or the address mistyped.`)}</p>
          <Link href="/" className="mt-6 inline-block font-medium underline">{i18n._(msg`Go to TrackLin.es`)}</Link>
        </main>
      </body>
    </html>
  );
}
