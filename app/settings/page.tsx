'use client';

import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PlanCard } from '@/components/billing/plan-card';
import { McpConnect } from '@/components/mcp-connect';
import { KeyRoundIcon, PlugIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/settings-card';
import { FileCleanupLink } from '@/components/settings/file-cleanup';
import { OrganizationCard } from '@/components/settings/organization-card';
import { attachments, organization, type FileCleanup } from '@/lib/api';
import { useToken } from '@/lib/use-token';

export default function SettingsPage() {
  // organization and integrations are run by org admins (TL-241): everyone else can look, not manage
  const token = useToken();
  const [admin, setAdmin] = useState(false);
  const signedIn = token !== null;
  const [cleanup, setCleanup] = useState<FileCleanup | null>(null);
  useEffect(() => { if (token) organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false)); }, [signedIn]);
  useEffect(() => { if (token && admin) attachments.cleanup(token).then(setCleanup, () => {}); }, [admin]); // admins only (TL-261)
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your organization’s plan, people and connections.</p>
      </header>
      {/* useSearchParams needs a Suspense boundary for static rendering */}
      <Suspense><ReturnBanner /></Suspense>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Plan />
        <OrganizationCard admin={admin} />
        {admin && <SettingsCard icon={PlugIcon} title="Integrations" href="/settings/integrations" description="Connect Bugfixes, GitHub and Bitbucket." />}
        <SettingsCard icon={KeyRoundIcon} title="API keys and AI agents"
          description="Keys let agents and scripts use the API as you. Connect an AI agent (Claude, Codex…) over MCP with its own key.">
          <Link href="/settings/api-keys" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Manage API keys</Link>
          <McpConnect
            keyHint={<>Each agent needs its own API key: create one in <Link href="/settings/api-keys" className="font-medium text-foreground underline">API keys</Link> and use it in place of <code>tl_ai_your_key</code>.</>}
            trigger={(open) => <Button variant="ghost" size="sm" onClick={open}>Connect AI</Button>}
          />
        </SettingsCard>
        {admin && <FileCleanupLink report={cleanup} />}
      </ul>
    </main>
  );
}

function Plan() {
  const token = useToken();
  return token ? <PlanCard token={token} /> : <li><Skeleton role="status" aria-label="Loading plan…" className="h-44 rounded-xl" /></li>;
}

// Stripe sends people back here with ?billing=success|cancelled (backend PORTAL_URL).
function ReturnBanner() {
  const result = useSearchParams().get('billing');
  if (result === 'success') return <p role="status" className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4">Thanks — you’re on Pro. It can take a moment for the plan to show up here.</p>;
  if (result === 'cancelled') return <p role="status" className="mb-6 rounded-xl border p-4 text-muted-foreground">Checkout cancelled — nothing was charged.</p>;
  return null;
}
