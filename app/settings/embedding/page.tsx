'use client';

import Link from 'next/link';
import { Trans } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { EmbeddingSettings } from '@/components/settings/embedding';

export default function EmbeddingSettingsPage() {
  const { is } = useFlags();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Embedding</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Put a public roadmap or your request form on your own site.</Trans></p>
      </header>
      {is('embedding').enabled() ? (
        <section className="rounded-xl border p-5">
          <EmbeddingSettings />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground"><Trans>Embedding isn’t turned on for your organization yet.</Trans></p>
      )}
    </main>
  );
}
