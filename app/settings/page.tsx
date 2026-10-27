'use client';

import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PlanCard } from '@/components/billing/plan-card';
import { useFlags } from '@flags-gg/react-library';
import { KeyRoundIcon, PlugIcon, UploadIcon, WebhookIcon } from 'lucide-react';
import { McpConnect } from '@/components/mcp-connect';
import { Button, buttonVariants } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/settings-card';
import { OrgReportCard } from '@/components/reports/report-links';
import { FileCleanupLink } from '@/components/settings/file-cleanup';
import { OrganizationCard } from '@/components/settings/organization-card';
import { attachments, organization, type FileCleanup } from '@/lib/api';
import { useToken } from '@/lib/use-token';

export default function SettingsPage() {
  // organization and integrations are run by org admins (TL-241): everyone else can look, not manage
  const token = useToken();
  const { is } = useFlags();
  const { t } = useLingui();
  const [admin, setAdmin] = useState(false);
  const signedIn = token !== null;
  const [cleanup, setCleanup] = useState<FileCleanup | null>(null);
  useEffect(() => { if (token) organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false)); }, [signedIn]);
  useEffect(() => { if (token && admin) attachments.cleanup(token).then(setCleanup, () => {}); }, [admin]); // admins only (TL-261)
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← <Trans>Projects</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Settings</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Your organization’s plan, people and connections.</Trans></p>
      </header>
      {/* useSearchParams needs a Suspense boundary for static rendering */}
      <Suspense><ReturnBanner /></Suspense>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Plan />
        <OrganizationCard admin={admin} />
        {admin && <OrgReportCard />}
        {admin && <SettingsCard icon={PlugIcon} title={t`Integrations`} href="/settings/integrations" description={t`Connect GitHub, Bitbucket, Google Chat and Bugfixes.`} />}
        {admin && is('imports').enabled() && <SettingsCard icon={UploadIcon} title={t`Import`} href="/settings/import" description={t`Bring work in from Jira, or from a CSV (Trello, Asana, Linear, spreadsheets), as new projects.`} />}
        {admin && is('webhooks').enabled() && <SettingsCard icon={WebhookIcon} title={t`Webhooks`} href="/settings/webhooks" description={t`Send ticket, sprint and roadmap events to your own tools as they happen.`} />}
        <SettingsCard icon={KeyRoundIcon} title={t`API keys`}
          description={<Trans>Service keys for servers and integrations. Your own keys and AI agents (Claude, Codex…) are in <Link href="/account/api-keys" className="underline">Your settings</Link>.</Trans>}>
          <Link href="/settings/api-keys" className={buttonVariants({ variant: 'outline', size: 'sm' })}><Trans>Manage API keys</Trans></Link>
          {/* only where AI keys can be made here too: the org-ai-keys flag (TL-451) */}
          {is('org-ai-keys').enabled() && (
            <McpConnect
              keyHint={<Trans>Each agent needs its own API key: create one in <Link href="/settings/api-keys" className="font-medium text-foreground underline">API keys</Link> and use it in place of <code>tl_ai_your_key</code>.</Trans>}
              trigger={(open) => <Button variant="ghost" size="sm" onClick={open}><Trans>Connect AI</Trans></Button>}
            />
          )}
        </SettingsCard>
        {admin && <FileCleanupLink report={cleanup} />}
      </ul>
    </main>
  );
}

function Plan() {
  const token = useToken();
  const { t } = useLingui();
  return token ? <PlanCard token={token} /> : <li><Skeleton role="status" aria-label={t`Loading plan…`} className="h-44 rounded-xl" /></li>;
}

// Stripe sends people back here with ?billing=success|cancelled (backend PORTAL_URL).
function ReturnBanner() {
  const result = useSearchParams().get('billing');
  if (result === 'success') return <p role="status" className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4"><Trans>Thanks — your plan is upgraded. It can take a moment to show up here.</Trans></p>;
  if (result === 'cancelled') return <p role="status" className="mb-6 rounded-xl border p-4 text-muted-foreground"><Trans>Checkout cancelled — nothing was charged.</Trans></p>;
  return null;
}
