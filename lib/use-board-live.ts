'use client';

import { useCallback, useEffect, useState } from 'react';
import { liveViews, streamBoardLive, type BoardLiveEvent, type LiveParticipant, type LiveStandup } from './api';
import { applyLiveEvent, type LiveViewState } from './live-view';

const empty: LiveViewState = { standup: null, refinementRevision: 0 };

export function useBoardLive(boardId: string, token: string | null | undefined) {
  const [state, setState] = useState<LiveViewState>(empty);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !boardId) return;
    const controller = new AbortController();
    const onEvent = (event: BoardLiveEvent) => setState((current) => applyLiveEvent(current, event));
    setState(empty);
    setConnected(false);

    void (async () => {
      try {
        const session = await liveViews.standup(boardId, token);
        setState((current) => ({ ...current, standup: session }));
      } catch {
        // 404 = no standup running; anything else: stream anyway, so a transient API outage recovers
      }
      await keepStreaming(() => streamBoardLive(boardId, token, controller.signal, onEvent, () => setConnected(true)), controller.signal, () => setConnected(false));
    })();
    return () => controller.abort();
  }, [boardId, token]);

  const start = useCallback(async (people: LiveParticipant[]) => {
    const session = await liveViews.startStandup(boardId, people, token);
    setState((current) => ({ ...current, standup: session }));
    return session;
  }, [boardId, token]);

  const act = useCallback(async (action: 'next' | 'previous' | 'jump' | 'pause' | 'resume' | 'end', index?: number) => {
    const session = await liveViews.standupAction(boardId, action, token, index);
    if (action === 'end') setState((current) => ({ ...current, standup: null }));
    else if (session) setState((current) => ({ ...current, standup: session }));
    return session;
  }, [boardId, token]);

  return { standup: state.standup, refinementRevision: state.refinementRevision, connected, start, act };
}

// keepStreaming holds the live stream open: whenever it drops (or fails), it reconnects after a wait
// that doubles up to 10s, back to the first wait once a connection worked; until signal aborts.
export async function keepStreaming(connect: () => Promise<void>, signal: AbortSignal, onDrop: () => void,
  sleep: (ms: number, signal: AbortSignal) => Promise<void> = wait, first = 500) {
  let backoff = first;
  while (!signal.aborted) {
    try {
      await connect();
      backoff = first;
    } catch {
      if (signal.aborted) break;
    }
    onDrop();
    await sleep(backoff, signal);
    backoff = Math.min(backoff * 2, 10_000);
  }
}

export function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}
