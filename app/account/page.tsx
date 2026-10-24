'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatDmCard } from '@/components/settings/chat-dm';
import { KeyRoundIcon } from 'lucide-react';
import { McpConnect } from '@/components/mcp-connect';
import { Button, buttonVariants } from '@/components/ui/button';
import { DevicePushCard } from '@/components/settings/device-push';
import { LanguageCard } from '@/components/settings/language';
import { SettingsCard } from '@/components/settings/settings-card';
import { useToken } from '@/lib/use-token';

// Your settings (TL-294): how you personally hear about things, and your own API keys: personal keys
// and AI agents (TL-451). The organization's plan, people, connections and service keys stay in Settings.
export default function AccountPage() {
  const token = useToken();
  const { t } = useLingui();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← <Trans>Projects</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Your settings</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>How you hear about tickets assigned to you, mentions and reviews, and your own API keys. Your name, email and sign-in are in your account menu.</Trans></p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {token ? (
          <>
            <LanguageCard token={token} />
            <DevicePushCard token={token} />
            <ChatDmCard token={token} />
            <SettingsCard icon={KeyRoundIcon} title={t`API keys`}
              description={t`Keys that act as you, for your own scripts and displays. Connect an AI agent (Claude, Codex…) over MCP with its own key.`}>
              <Link href="/account/api-keys" className={buttonVariants({ variant: 'outline', size: 'sm' })}><Trans>Manage API keys</Trans></Link>
              <McpConnect
                keyHint={<Trans>Each agent needs its own API key: create one in <Link href="/account/api-keys" className="font-medium text-foreground underline">API keys</Link> and use it in place of <code>tl_ai_your_key</code>.</Trans>}
                trigger={(open) => <Button variant="ghost" size="sm" onClick={open}><Trans>Connect AI</Trans></Button>}
              />
            </SettingsCard>
          </>
        ) : <li><Skeleton role="status" aria-label={t`Loading…`} className="h-44 rounded-xl" /></li>}
      </ul>
    </main>
  );
}
