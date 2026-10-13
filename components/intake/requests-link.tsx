'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { intake } from '@/lib/api';

// RequestsLink: "Requests (3)" in the project header while the form is open or requests wait.
export function RequestsLink({ projectId, token }: { projectId: string; token: string }) {
  const [state, setState] = useState<{ open: boolean; waiting: number } | null>(null);
  useEffect(() => {
    Promise.all([intake.settings(projectId, token), intake.submissions(projectId, token)])
      .then(([s, list]) => setState({ open: s.open, waiting: list.length }), () => setState(null));
  }, [projectId]);
  return <RequestsLinkView projectId={projectId} state={state} />;
}

// RequestsLinkView: shown while the form is open or requests wait, with how many wait (pure, for tests).
export function RequestsLinkView({ projectId, state }: { projectId: string; state: { open: boolean; waiting: number } | null }) {
  if (!state || (!state.open && state.waiting === 0)) return null;
  return (
    <Link href={`/projects/${projectId}/requests`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
      Requests{state.waiting > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{state.waiting}</span>}
    </Link>
  );
}
