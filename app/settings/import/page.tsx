'use client';

import Link from 'next/link';
import { Trans } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { CSVImport } from '@/components/settings/csv-import';

export default function ImportSettingsPage() {
  const { is } = useFlags();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Import</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Bring tickets in from a CSV as a new project. You see what it will make before anything is created, and can scrap it afterwards.</Trans></p>
      </header>
      {is('imports').enabled() ? (
        <section className="rounded-xl border p-5"><CSVImport /></section>
      ) : (
        <p className="text-sm text-muted-foreground"><Trans>Importing isn’t turned on for your organization yet.</Trans></p>
      )}
    </main>
  );
}
