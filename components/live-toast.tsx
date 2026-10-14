'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { LIVE_LABEL, type LiveState } from '@/lib/live-status';
import { cn } from '@/lib/utils';

const ID = 'live-updates'; // one toast, updated in place as the connection changes

const DOT: Record<LiveState, string> = {
  live: 'bg-emerald-500',
  connecting: 'animate-pulse bg-amber-500',
  reconnecting: 'animate-pulse bg-amber-500',
  unavailable: 'bg-destructive',
};

// LivePill: the live-updates status, as small as the browser's link preview: a dot and a few words,
// with what it means on hover (pure, for tests).
export function LivePill({ state }: { state: LiveState }) {
  const { text, hint } = LIVE_LABEL[state];
  return (
    <span role="status" title={hint} aria-description={hint}
      className="inline-flex items-center gap-1.5 rounded-full border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-sm">
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[state])} />
      {text}
    </span>
  );
}

// LiveToast: while mounted (you've joined a standup or are refining), the pill sits in the bottom
// left corner; it goes when you leave.
export function LiveToast({ state }: { state: LiveState }) {
  useEffect(() => {
    toast.custom(() => <LivePill state={state} />, { id: ID, duration: Infinity, dismissible: false, unstyled: true });
  }, [state]);
  useEffect(() => () => { toast.dismiss(ID); }, []);
  return null;
}
