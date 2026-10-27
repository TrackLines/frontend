import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { day, fromAPI, type PromptVersion } from '../../page';

type Props = { params: Promise<{ version: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { version } = await params;
  return { title: `MCP pre-prompt, version ${version} · TrackLin.es docs` };
}

// One version of the MCP pre-prompt as it was published (TL-674): versions never change, like the terms'.
export default async function McpPromptVersionPage({ params }: Props) {
  const { version } = await params;
  if (!/^[1-9]\d{0,5}$/.test(version)) notFound();
  const v = await fromAPI<PromptVersion>(`/api/mcp/prompts/versions/${version}`);
  if (!v || !v.body) notFound();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/docs/mcp" className="text-sm text-muted-foreground hover:underline">← Connect an AI agent</Link>
      <article className="mt-2">
        <h1 className="text-3xl font-bold tracking-tight">MCP pre-prompt, version {v.version}</h1>
        <p className="mt-2 text-muted-foreground">
          Published {day(v.published_at)}{v.note ? `: ${v.note}` : ''}. What every agent was told when it connected, until a newer version replaced it.{' '}
          <Link href="/docs/mcp" className="underline">See the current version</Link>.
        </p>
        <pre className="mt-6 rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap">{v.body}</pre>
      </article>
    </main>
  );
}
