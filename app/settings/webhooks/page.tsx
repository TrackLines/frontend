'use client';

import Link from 'next/link';
import { Trans } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { WebhooksSettings } from '@/components/settings/webhooks';

export default function WebhooksSettingsPage() {
  const { is } = useFlags();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Webhooks</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Tell your own tools when work changes: TrackLin.es sends each event to your endpoint as it happens.</Trans> <Link href="/docs/webhooks" className="underline"><Trans>How webhooks work</Trans></Link></p>
      </header>
      {is('webhooks').enabled() ? (
        <section className="rounded-xl border p-5">
          <WebhooksSettings />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground"><Trans>Webhooks aren’t turned on for your organization yet.</Trans></p>
      )}
    </main>
  );
}
