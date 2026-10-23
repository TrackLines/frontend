'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { integrations } from '@/lib/api';
import { integrationError, PROVIDER_NAMES } from '@/lib/integrations';
import { useToken } from '@/lib/use-token';

// Where GitHub (after installing the app) and Bitbucket (after authorizing) send the admin back:
// finish connecting with what they passed along.
export default function ConnectCallbackPage() {
  return <Suspense><Callback /></Suspense>;
}

function Callback() {
  const { provider } = useParams<{ provider: string }>();
  const params = useSearchParams();
  const token = useToken();
  const { t, i18n } = useLingui();
  const [result, setResult] = useState<'working' | 'done' | string>('working');
  const sent = useRef(false);
  const known = provider === 'github' || provider === 'bitbucket';

  useEffect(() => {
    if (!known || !token || sent.current) return;
    sent.current = true; // once: the state can't be used twice
    const state = params.get('state') ?? '';
    integrations.complete(provider, { state, installation_id: params.get('installation_id') ?? undefined, code: params.get('code') ?? undefined }, token)
      .then(() => setResult('done'), (err) => setResult(integrationError(i18n, err, t`Couldn’t finish connecting ${PROVIDER_NAMES[provider]}.`)));
  }, [token, known]);

  const name = known ? PROVIDER_NAMES[provider] : provider;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      {!known ? <p role="alert"><Trans>Unknown integration.</Trans></p>
        : result === 'working' ? <p role="status"><Trans>Connecting {name}…</Trans></p>
        : result === 'done' ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight"><Trans>{name} connected</Trans></h1>
            <p className="text-muted-foreground"><Trans>Now link repositories to a project from the project&apos;s page.</Trans></p>
          </>
        ) : <p role="alert" className="text-destructive">{result}</p>}
      {result !== 'working' && <Link href="/settings/integrations" className={buttonVariants({ variant: 'outline' })}><Trans>Back to integrations</Trans></Link>}
    </main>
  );
}
