'use client';

import { useAuth } from '@clerk/nextjs';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Joyride } from 'react-joyride';
import { useFlags } from '@flags-gg/react-library';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { boardTemplates, invitations, onboarding, projects, type BoardTemplate, type OnboardingState, type Project } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';
import { boardDestination } from '@/lib/org/onboarding';

export function OnboardingSetup({ nonce }: { nonce?: string }) {
  const { orgId, userId } = useAuth();
  return orgId && userId ? <Setup key={`${orgId}:${userId}`} nonce={nonce} /> : null;
}

function Setup({ nonce }: { nonce?: string }) {
  const { t } = useLingui();
  const { is } = useFlags();
  const router = useRouter();
  const token = useToken();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [existing, setExisting] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [template, setTemplate] = useState('builtin:simple');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    if (!token) return;
    let live = true;
    // Initialize the resume record before offering the import route.
    onboarding.status(token).then(async (s) => {
      if (!live) return;
      if (!s.admin || s.step === 'complete') { router.replace('/dashboard'); return; }
      setState(s);
      const [ts, ps] = await Promise.all([boardTemplates.list(token), projects.list(token)]);
      const details = await Promise.all(ps.map((p) => projects.get(p.id, token)));
      if (live) { setTemplates(ts); setExisting(details); setLoaded(true); }
    }).catch(() => { if (live) setError(t`Couldn’t load setup. Please try again.`); });
    return () => { live = false; };
  }, [token !== null, router]);

  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : t`Something went wrong. Please try again.`); }
    finally { setBusy(false); }
  }

  function create(e: FormEvent) {
    e.preventDefault();
    void action(async () => { setState(await onboarding.setup({ name, key_prefix: key, template_id: template }, token)); setTip(false); });
  }

  function invite(e: FormEvent) {
    e.preventDefault();
    void action(async () => { await invitations.create({ email_address: email.trim(), scope: 'organization' }, token); setEmail(''); setSent(true); });
  }

  function finish() {
    void action(async () => { const s = await onboarding.finish(token); router.push(`${boardDestination(s)}?guide=1`); });
  }

  return <main className="mx-auto max-w-2xl px-6 py-10">
    <h1 className="text-3xl font-bold"><Trans>Welcome to TrackLin.es</Trans></h1>
    <p className="mt-2 mb-6 text-muted-foreground"><Trans>Set up your team’s first board. You can leave and continue later.</Trans></p>
    {error && <p role="alert" className="mb-4 text-destructive">{error}</p>}
    {!loaded || !state ? <><p role="status"><Trans>Loading…</Trans></p>{error && <Button onClick={() => window.location.reload()}><Trans>Retry</Trans></Button>}</> : <>
      <Button variant="ghost" size="sm" onClick={() => setTip(true)}><Trans>Show me around</Trans></Button>
      <section id="setup-stage" className="mt-4 rounded-xl border p-6">
        {state.step === 'project' || !state.board_id ? <>
          <h2 className="text-xl font-semibold"><Trans>Create your first project</Trans></h2>
          <form onSubmit={create} className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm"><Trans>Project name</Trans><Input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="grid gap-2 text-sm"><Trans>Ticket key prefix</Trans><Input required pattern="[A-Z][A-Z0-9]{1,5}" minLength={2} maxLength={6} value={key} placeholder="WEB" onChange={(e) => setKey(e.target.value.toUpperCase())} /><span className="text-muted-foreground"><Trans>Use 2–6 capital letters or digits, starting with a letter.</Trans></span></label>
            <div className="grid gap-2 text-sm"><label htmlFor="onboarding-template"><Trans>Start with</Trans></label>
              <Select value={template} onValueChange={(value) => { if (value) setTemplate(value); }} items={{ 'builtin:simple': t`Start empty`, ...Object.fromEntries(templates.filter((x) => x.id !== 'builtin:simple').map((x) => [x.id, x.name])) }}>
                <SelectTrigger id="onboarding-template" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin:simple">{t`Start empty`}</SelectItem>
                  {templates.filter((x) => x.id !== 'builtin:simple').map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>{busy ? <Trans>Saving…</Trans> : <Trans>Create project and board</Trans>}</Button>
          </form>
          {is('imports').enabled() && <div className="mt-6 border-t pt-4">
            <p className="mb-2 text-sm"><Trans>Already have work elsewhere? Import it first, then return here to choose its board.</Trans></p>
            <Link href="/settings/import?onboarding=1" className={buttonVariants({ variant: 'outline' })}><Trans>Import existing work</Trans></Link>
          </div>}
          {existing.some((p) => p.boards?.length) && <div className="mt-6 grid gap-2 border-t pt-4">
            <h3 className="font-medium"><Trans>Continue with an existing board</Trans></h3>
            {existing.flatMap((p) => (p.boards ?? []).filter((b) => !b.archived_at).map((b) => <Button key={b.id} variant="outline" disabled={busy} onClick={() => void action(async () => setState(await onboarding.setup({ board_id: b.id }, token)))}>{p.name} · {b.name}</Button>))}
          </div>}
        </> : <>
          <h2 className="text-xl font-semibold"><Trans>Invite your teammates</Trans></h2>
          <p className="mt-2 text-sm text-muted-foreground"><Trans>You can invite people now or come back to this in organization settings.</Trans></p>
          <form onSubmit={invite} className="my-4 grid gap-3">
            <label className="grid gap-2 text-sm"><Trans>Email address</Trans><Input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} /></label>
            <Button type="submit" variant="outline" disabled={busy}><Trans>Send invitation</Trans></Button>
          </form>
          {sent && <p role="status" className="mb-4 text-sm"><Trans>Invitation sent. You can invite another teammate.</Trans></p>}
          <Button onClick={finish} disabled={busy}>{busy ? <Trans>Saving…</Trans> : <Trans>Continue to your board</Trans>}</Button>
        </>}
      </section>
      <Joyride nonce={nonce} continuous run={tip} key={`${state.step}:${tip}`} steps={[{ target: '#setup-stage', skipBeacon: true, content: state.step === 'project' ? t`Choose an empty board or a template, or import your existing work. Imported projects count towards your plan’s project limit.` : t`Inviting teammates is optional. Continue to your board whenever you’re ready.` }]}
        onEvent={(e) => { if (e.type === 'tour:end') setTip(false); }} locale={{ last: t`Got it`, close: t`Close`, next: t`Next`, back: t`Back` }} options={{ primaryColor: '#4f46e5', textColor: '#111827', backgroundColor: '#ffffff' }} />
    </>}
  </main>;
}
