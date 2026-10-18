'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatDmCard } from '@/components/settings/chat-dm';
import { ApiKeysManager } from '@/components/settings/api-keys';
import { DevicePushCard } from '@/components/settings/device-push';
import { useToken } from '@/lib/use-token';

// Your settings (TL-294): how you personally hear about things, and your own API keys: personal keys
// and AI agents (TL-451). The organization's plan, people, connections and service keys stay in Settings.
export default function AccountPage() {
  const token = useToken();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">How you hear about tickets assigned to you, mentions and reviews, and your own API keys. Your name, email and sign-in are in your account menu.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {token ? (
          <>
            <DevicePushCard token={token} />
            <ChatDmCard token={token} />
          </>
        ) : <li><Skeleton role="status" aria-label="Loading…" className="h-44 rounded-xl" /></li>}
      </ul>
      <section id="api-keys" className="mt-10 scroll-mt-20">
        <h2 className="text-xl font-semibold tracking-tight">Your API keys</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Keys that act as you, for your own scripts, displays and AI agents. Send one as{' '}
          <code className="rounded bg-muted px-1">Authorization: Bearer tl_p_…</code> to <code className="rounded bg-muted px-1">/api</code>.
        </p>
        {token && <ApiKeysManager token={token} kinds={['personal', 'ai']} />}
      </section>
    </main>
  );
}
