'use client';

import { useAuth } from '@clerk/nextjs';
import { Trans, useLingui } from '@lingui/react/macro';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Joyride, type EventData } from 'react-joyride';
import { CheckIcon, CompassIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { onboarding, projects, type OnboardingState } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';
import { boardDestination, finishedGuide, GUIDE, mergeGuideStatus, needsSetup, offerGuide } from '@/lib/org/onboarding';
import { advanceTour, guideCovered, listenForGuideActions, startTour, tourStep, waitForGuideTarget, type Chapter, type GuideAction, type Tour } from '@/lib/org/guide-tour';

// The layout stays mounted across page changes. Tours follow real controls and successful writes.
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
  const [tour, setTour] = useState<Tour | null>(null);
  const [completed, setCompleted] = useState<Chapter[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(false);
  const [starting, setStarting] = useState(false);
  const inFlight = useRef(false);
  const autoStarted = useRef(false);
  const chosenProject = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    onboarding.status(token).then((s) => {
      if (!live) return;
      setState((current) => mergeGuideStatus(current, s));
      chosenProject.current ??= s.project_id;
      if (needsSetup(s) && path === '/dashboard') router.replace('/onboarding');
      if (offerGuide(s) && !autoStarted.current && s.board_id && path === boardDestination(s) && new URLSearchParams(window.location.search).get('guide') === '1') {
        autoStarted.current = true;
        setCompleted(['project']);
        // Setup has created the project already. Continue with its real backlog.
        setTour({ ...startTour('all', s.project_id, ['project']), chapters: ['ticket', 'github', 'tui', 'mcp'], stage: 'ticket-project' });
        router.replace(path, { scroll: false });
      }
    }, () => { /* retry status on navigation; optional guides do not prevent using the app */ });
    return () => { live = false; };
  }, [token !== null, path, router]);

  const dispatch = useCallback((action: GuideAction) => {
    if ('projectId' in action) chosenProject.current = action.projectId;
    setTour((current) => current && advanceTour(current, action));
  }, []);
  useEffect(() => listenForGuideActions(document, dispatch), [dispatch]);

  async function complete() {
    if (!token || inFlight.current) return;
    inFlight.current = true;
    setSaving(true); setError('');
    try {
      setState(await onboarding.completeGuide(GUIDE, token));
      setPending(false); setOpen(false);
    } catch {
      setError(t`Couldn’t save guide completion. Please try again.`);
      setPending(true);
    } finally { inFlight.current = false; setSaving(false); }
  }

  useEffect(() => {
    if (tour?.stage !== 'done') return;
    setCompleted(tour.completed);
    setTour(null); setOpen(true);
    if (guideCovered(tour.completed)) { setPending(true); void complete(); }
  }, [tour]);

  async function start(chapter: Chapter | 'all') {
    if (!token || starting) return;
    setStarting(true); setError('');
    try {
      const list = await projects.list(token);
      const current = path.match(/^\/projects\/([^/]+)/)?.[1];
      const projectId = [current, chosenProject.current, list[0]?.id].find((id) => id && list.some((p) => p.id === id)) ?? null;
      chosenProject.current = projectId;
      setTour(startTour(chapter, projectId, completed));
      setOpen(false);
    } catch { setError(t`Couldn’t start the guide. Please try again.`); }
    finally { setStarting(false); }
  }

  if (!state?.admin) return null;
  if (needsSetup(state)) return <Link href="/onboarding" aria-label={t`Continue setup`} title={t`Continue setup`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><CompassIcon /><span className="hidden sm:inline"><Trans>Continue setup</Trans></span></Link>;
  if (!offerGuide(state)) return null;
  const chapters: { id: Chapter; label: string }[] = [
    { id: 'project', label: t`Create a project` }, { id: 'ticket', label: t`Create your first ticket` },
    { id: 'github', label: t`Connect GitHub` }, { id: 'tui', label: t`Try the terminal app` }, { id: 'mcp', label: t`Connect an AI agent` },
  ];
  return <>
    <Button size="sm" variant="ghost" onClick={() => { setTour(null); setOpen(true); }} aria-label={t`Guide`} title={t`Guide`}>
      <CompassIcon /><span className="hidden sm:inline"><Trans>Guide</Trans></span>
    </Button>
    {open && <aside aria-label={t`Getting started`} className="fixed bottom-20 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-card p-5 text-card-foreground shadow-lg print:hidden">
      <h2 className="text-lg font-semibold"><Trans>Getting started</Trans></h2>
      <ul className="my-4 grid gap-2">{chapters.map((chapter) => <li key={chapter.id}>
        <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" disabled={starting || saving} onClick={() => void start(chapter.id)}>
          {completed.includes(chapter.id) && <CheckIcon aria-label={t`Complete`} />}{chapter.label}
        </Button>
      </li>)}</ul>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {pending ? <Button size="sm" onClick={complete} disabled={saving}>{saving ? <Trans>Saving…</Trans> : <Trans>Retry</Trans>}</Button>
          : <Button size="sm" disabled={starting} onClick={() => void start('all')}><Trans>Start guide</Trans></Button>}
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => setOpen(false)}><Trans>Close</Trans></Button>
      </div>
    </aside>}
    {tour && tour.stage !== 'done' && <TourStep nonce={nonce} tour={tour} dispatch={dispatch} onStop={() => { setCompleted(tour.completed); setTour(null); setOpen(true); }} />}
  </>;
}

function TourStep({ nonce, tour, dispatch, onStop }: { nonce?: string; tour: Tour; dispatch: (action: GuideAction) => void; onStop: () => void }) {
  const { t } = useLingui();
  const path = usePathname();
  const router = useRouter();
  const step = tourStep(tour)!;
  const [ready, setReady] = useState<{ stage: string; element: HTMLElement } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tourFailed = useRef(false);
  useEffect(() => {
    setReady(null); setFailed(false); tourFailed.current = false;
    if (path !== step.path) {
      router.push(step.path);
      const timeout = setTimeout(() => setFailed(true), 15000);
      return () => clearTimeout(timeout);
    }
    const controller = new AbortController();
    waitForGuideTarget(document, step.target, controller.signal).then((element) => {
      if (!controller.signal.aborted) setReady({ stage: tour.stage, element });
    }, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [tour.stage, step.path, step.target, path, attempt, router]);
  const content: Record<Exclude<Tour['stage'], 'done'>, string> = {
    'project-new': t`Click New project to create a project. You can also continue with one you already have.`,
    'project-name': t`Enter your project’s name here, then choose Next to see where to save it.`,
    'project-submit': t`Click Create project to save it. The guide waits until the project has been created.`,
    'ticket-project': t`Open the project you want to add a ticket to.`,
    'ticket-backlog': t`Click the Backlog tab to see work waiting to be planned.`,
    'ticket-add': t`Click Add to backlog to create a ticket in this project.`,
    'ticket-title': t`Enter a ticket title, choose its type and add any details. Choose Next when you’re ready.`,
    'ticket-submit': t`Click Add to backlog to save your ticket. The guide waits for it to succeed.`,
    github: t`This is your organization’s GitHub connection. Use Connect GitHub to authorize your account; link repositories from Edit project.`,
    tui: t`Install the terminal app using this command, then follow this page’s API key and configuration instructions.`,
    mcp: t`Use these connection settings to connect your agent over MCP with its own API key.`,
  };
  function event(event: EventData) {
    if (event.type === 'error' || event.type === 'error:target_not_found') { tourFailed.current = true; setFailed(true); setReady(null); return; }
    if (event.type !== 'tour:end') return;
    if (finishedGuide(event) && !step.action && !tourFailed.current) dispatch({ type: 'next' });
    else if (event.status === 'skipped') onStop();
  }
  const target = ready?.stage === tour.stage && path === step.path ? ready.element : null;
  const next = advanceTour(tour, { type: 'next' });
  const last = next.stage === 'done' ? (guideCovered(next.completed) ? t`Finish guide` : t`Got it`) : t`Next`;
  return <>
    {(!target || failed) && <aside role={failed ? 'alert' : 'status'} className="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border bg-card p-4 text-sm shadow-lg">
      <p>{failed ? t`This guide step couldn’t load. Retry or close the guide.` : t`Opening the next guide step…`}</p>
      {failed && <Button size="sm" variant="ghost" onClick={() => setAttempt((a) => a+1)}><Trans>Retry</Trans></Button>}
      <Button size="sm" variant="ghost" onClick={onStop}><Trans>Close</Trans></Button>
    </aside>}
    {target && !failed && <Joyride key={`${tour.stage}:${attempt}`} nonce={nonce} continuous run portalElement={target.closest('[role="dialog"]') ?? document.body}
      steps={[{ target, skipBeacon: true, content: <>
        <p>{content[tour.stage as Exclude<Tour['stage'], 'done'>]}</p>
        {tour.stage === 'project-new' && tour.projectId && <Button size="sm" variant="outline" className="mt-3" onClick={() => dispatch({ type: 'use-existing' })}><Trans>Use an existing project</Trans></Button>}
      </> }]}
      onEvent={event} locale={{ last, close: t`Close`, back: t`Back` }}
      options={{ buttons: step.action ? ['close'] : ['primary', 'close'], closeButtonAction: 'skip', dismissKeyAction: false, overlayClickAction: false, disableFocusTrap: true, blockTargetInteraction: false, hideOverlay: !!target.closest('[role="dialog"]'), zIndex: 10000, primaryColor: '#4f46e5', backgroundColor: '#ffffff', textColor: '#111827' }} />}
  </>;
}
