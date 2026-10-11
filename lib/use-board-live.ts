'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, liveViews, streamBoardLive, type BoardLiveEvent, type LiveParticipant, type LiveStandup } from './api';
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
        try {
          const session = await liveViews.standup(boardId, token);
          setState((current) => ({ ...current, standup: session }));
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
          setState((current) => ({ ...current, standup: null }));
        }
        let backoff = 500;
        while (!controller.signal.aborted) {
          try {
            await streamBoardLive(boardId, token, controller.signal, onEvent, () => setConnected(true));
            backoff = 500;
          } catch {
            if (controller.signal.aborted) break;
          }
          setConnected(false);
          await wait(backoff, controller.signal);
          backoff = Math.min(backoff * 2, 10_000);
        }
      } catch {
        // The stream still retries after initial-state errors so a transient API outage can recover.
        if (!controller.signal.aborted) {
          let backoff = 1_000;
          while (!controller.signal.aborted) {
            try {
              await streamBoardLive(boardId, token, controller.signal, onEvent, () => setConnected(true));
            } catch {
              if (controller.signal.aborted) break;
            }
            setConnected(false);
            await wait(backoff, controller.signal);
            backoff = Math.min(backoff * 2, 10_000);
          }
        }
      }
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

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}
