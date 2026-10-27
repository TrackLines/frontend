'use client';

import { useAuth } from '@clerk/nextjs';
import { Trans, useLingui } from '@lingui/react/macro';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Joyride, type EventData } from 'react-joyride';
import { CompassIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { onboarding, type OnboardingState } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';
import { boardDestination, finishedGuide, GUIDE, needsSetup, offerGuide } from '@/lib/org/onboarding';

// Key all state to both identities: switching organizations/users cannot reuse another guide.
export function OnboardingGuide({ nonce }: { nonce?: string }) {
  const { orgId, userId } = useAuth();
  return orgId && userId ? <Guide key={`${orgId}:${userId}`} nonce={nonce} /> : null;
}

function Guide({ nonce }: { nonce?: string }) {
  const { t } = useLingui();
  const token = useToken();
  const path = usePathname();
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const autoStarted = useRef(false);
  const tourFailed = useRef(false);

  useEffect(() => {
    if (!token) return;
    let live = true;
    onboarding.status(token).then((s) => {
      if (!live) return;
      setState(s);
      if (needsSetup(s) && path === '/dashboard') router.replace('/onboarding');
      if (offerGuide(s) && !autoStarted.current && s.board_id && path === boardDestination(s) && new URLSearchParams(window.location.search).get('guide') === '1') {
        autoStarted.current = true;
        setOpen(true);
        setRun(true);
        router.replace(path, { scroll: false });
      }
    }, () => { /* optional guide must not prevent using the application; retry on navigation */ });
    return () => { live = false; };
  }, [token !== null, path, router]);

  async function complete() {
    if (!token || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      setState(await onboarding.completeGuide(GUIDE, token));
      setPending(false);
      setOpen(false);
    } catch {
      setError(t`Couldn’t save guide completion. Please try again.`);
      setPending(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function onEvent(event: EventData) {
    if (event.type === 'error' || event.type === 'error:target_not_found') { tourFailed.current = true; setRun(false); return; }
    if (event.type !== 'tour:end') return;
    setRun(false);
    if (finishedGuide(event) && !tourFailed.current) { setPending(true); void complete(); }
  }

  if (!state?.admin) return null;
  if (needsSetup(state)) return <Link href="/onboarding" aria-label={t`Continue setup`} title={t`Continue setup`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><CompassIcon /><span className="hidden sm:inline"><Trans>Continue setup</Trans></span></Link>;
  if (!offerGuide(state)) return null;

  const links = [
    { id: 'ticket', href: boardDestination(state), label: t`Create your first ticket`, content: t`Open a board and use Add ticket to turn an idea into work your team can follow.` },
    { id: 'github', href: '/settings/integrations', label: t`Connect GitHub`, content: t`Connect your repository so pull requests stay linked to the tickets they deliver.` },
    { id: 'tui', href: '/docs/tui', label: t`Try the terminal app`, content: t`Create, edit and move tickets from your terminal with the TUI.` },
    { id: 'mcp', href: '/docs/mcp', label: t`Connect an AI agent`, content: t`Give your agent its own API key and connect it over MCP to work on tickets with your team.` },
  ];
  return <>
    <Button size="sm" variant="ghost" onClick={() => { setOpen(true); setRun(false); setError(''); }} aria-label={t`Guide`} title={t`Guide`}>
      <CompassIcon /><span className="hidden sm:inline"><Trans>Guide</Trans></span>
    </Button>
    {open && <aside aria-label={t`Getting started`} className="fixed bottom-20 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-card p-5 text-card-foreground shadow-lg print:hidden">
      <h2 className="text-lg font-semibold"><Trans>Getting started</Trans></h2>
      <ul className="my-4 grid gap-3">
        {links.map((link) => <li id={`guide-${link.id}`} key={link.id}>
          <Link href={link.href} onClick={() => { setRun(false); setOpen(false); }} className="text-sm underline">{link.label}</Link>
        </li>)}
      </ul>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {pending ? <Button size="sm" onClick={complete} disabled={saving}>{saving ? <Trans>Saving…</Trans> : <Trans>Retry</Trans>}</Button>
          : <Button size="sm" onClick={() => { tourFailed.current = false; setRun(true); }}><Trans>Start guide</Trans></Button>}
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setRun(false); setOpen(false); }}><Trans>Close</Trans></Button>
      </div>
    </aside>}
    {open && <Joyride key={String(run)} nonce={nonce} continuous run={run} steps={links.map((link) => ({ target: `#guide-${link.id}`, content: link.content, title: link.label, skipBeacon: true }))}
      onEvent={onEvent} locale={{ back: t`Back`, next: t`Next`, last: t`Finish guide`, close: t`Close`, skip: t`Skip`, open: t`Start guide` }}
      options={{ zIndex: 10000, primaryColor: '#4f46e5', backgroundColor: '#ffffff', textColor: '#111827' }} />}
  </>;
}
