'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { LIVE_LABEL, type LiveState } from '@/lib/live-status';

const ID = 'live-updates'; // one toast, updated in place as the connection changes

// liveToast: how the live-updates toast looks for a state (pure, for tests).
export function liveToast(state: LiveState) {
  const { text, hint } = LIVE_LABEL[state];
  const kind = state === 'live' ? 'success' : state === 'unavailable' ? 'warning' : 'loading';
  return { kind, text, hint } as const;
}

// LiveToast: while mounted (you've joined a standup or are refining), a small toast at the bottom
// of the screen says what the live-updates connection is doing; it goes when you leave.
export function LiveToast({ state }: { state: LiveState }) {
  useEffect(() => {
    const t = liveToast(state);
    toast[t.kind](t.text, { id: ID, description: t.hint, duration: Infinity, dismissible: false });
  }, [state]);
  useEffect(() => () => { toast.dismiss(ID); }, []);
  return null;
}
