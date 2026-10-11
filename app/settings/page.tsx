'use client';

import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PlanCard } from '@/components/billing/plan-card';
import { McpConnect } from '@/components/mcp-connect';
import { Button } from '@/components/ui/button';
import { useToken } from '@/lib/use-token';

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <h1 className="mt-2 mb-6 text-3xl font-bold tracking-tight">Settings</h1>
      {/* useSearchParams needs a Suspense boundary for static rendering */}
      <Suspense><ReturnBanner /></Suspense>
      <Plan />
      <section className="mt-6 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Organization</h2>
        <p className="mt-2 text-sm text-muted-foreground">View members, teams, project access, and leadership.</p>
        <Link href="/settings/organization" className="mt-3 inline-block text-sm font-medium hover:underline">Manage organization →</Link>
      </section>
      <section className="mt-6 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-2 text-sm text-muted-foreground">Connect Bugfixes, GitHub and Bitbucket.</p>
        <Link href="/settings/integrations" className="mt-3 inline-block text-sm font-medium hover:underline">Manage integrations →</Link>
      </section>
      <section className="mt-6 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">API keys and AI agents</h2>
        <p className="mt-2 text-sm text-muted-foreground">Keys let agents and scripts use the API as you. Connect an AI agent (Claude, Codex…) over MCP with its own key.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link href="/settings/api-keys" className="text-sm font-medium hover:underline">Manage API keys →</Link>
          <McpConnect
            keyHint={<>Each agent needs its own API key: create one in <Link href="/settings/api-keys" className="font-medium text-foreground underline">API keys</Link> and use it in place of <code>tl_your_key</code>.</>}
            trigger={(open) => <Button variant="outline" size="sm" onClick={open}>Connect AI</Button>}
          />
        </div>
      </section>
    </main>
  );
}

function Plan() {
  const token = useToken();
  return token ? <PlanCard token={token} /> : <Skeleton role="status" aria-label="Loading plan…" className="h-36 w-full rounded-xl" />;
}

// Stripe sends people back here with ?billing=success|cancelled (backend PORTAL_URL).
function ReturnBanner() {
  const result = useSearchParams().get('billing');
  if (result === 'success') return <p role="status" className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4">Thanks — you’re on Pro. It can take a moment for the plan to show up here.</p>;
  if (result === 'cancelled') return <p role="status" className="mb-6 rounded-xl border p-4 text-muted-foreground">Checkout cancelled — nothing was charged.</p>;
  return null;
}
