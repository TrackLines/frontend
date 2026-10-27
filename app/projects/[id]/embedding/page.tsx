'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trans } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { EmbeddingSettings } from '@/components/settings/embedding';

// The project's embedding (TL-683): the sites allowed to show its roadmaps and request form, and the keys
// their widgets count usage under. Reached from Edit project.
export default function ProjectEmbeddingPage() {
  const { id } = useParams<{ id: string }>();
  const { is } = useFlags();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${id}/edit`} className="text-sm text-muted-foreground hover:underline">← <Trans>Edit project</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Embedding</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Put this project’s public roadmaps or its request form on your own site.</Trans></p>
      </header>
      {is('embedding').enabled() ? (
        <section className="rounded-xl border p-5">
          <EmbeddingSettings projectId={id} />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground"><Trans>Embedding isn’t turned on for your organization yet.</Trans></p>
      )}
    </main>
  );
}
