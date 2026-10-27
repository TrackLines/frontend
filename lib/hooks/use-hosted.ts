'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, hosted, streamLive, type HostedFocus, type HostedPaths, type HostedSession } from '../api';
import { applyHosted, roleIn } from '../live/hosted';
import { keepStreaming } from './use-board-live';

const HEARTBEAT_MS = 30_000; // the server drops people it hasn't heard from in a minute

// useHosted follows a hosted session (TL-221): the running session (from the live stream), whether
// you've joined, your role, and the actions. While joined it sends a heartbeat every 30s, and it
// leaves when you navigate away.
export function useHosted(paths: HostedPaths | null, token: string | null) {
  const { userId } = useAuth();
  const [session, setSession] = useState<HostedSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [following, setFollowing] = useState(true);
  const key = paths?.session;

  useEffect(() => {
    if (!paths || !token) return;
    const controller = new AbortController();
    hosted.get(paths, token).then(setSession, () => setSession(null));
    void keepStreaming(() => streamLive(paths.stream, token, controller.signal,
      (event) => setSession((s) => applyHosted(s, event, paths.kind))), controller.signal, () => {});
    return () => controller.abort();
  }, [key, token != null]); // token refreshes must not reconnect

  // the server has ended it (host ended it, or was gone too long): we're no longer in it
  useEffect(() => { if (!session) setJoined(false); }, [session]);

  useEffect(() => {
    if (!paths || !token || !joined) return;
    const beat = setInterval(() => { void hosted.join(paths, token).then(setSession, () => {}); }, HEARTBEAT_MS);
    return () => { clearInterval(beat); void hosted.leave(paths, token).catch(() => {}); };
  }, [key, joined, token != null]);

  const join = useCallback(async () => {
    if (!paths || !token) return;
    setSession(await hosted.join(paths, token));
    setFollowing(true);
    setJoined(true);
  }, [key, token]);

  // start hosts a new session; if someone beat us to it, join theirs instead
  const start = useCallback(async () => {
    if (!paths?.start || !token) return;
    try {
      setSession(await hosted.start(paths, token));
      setJoined(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) await join(); else throw err;
    }
  }, [key, token, join]);

  const leave = useCallback(() => setJoined(false), []); // the heartbeat effect's cleanup tells the server
  const end = useCallback(async () => {
    if (!paths?.end || !token) return;
    await hosted.end(paths, token).catch(() => {});
    setSession(null);
  }, [key, token]);
  const focus = useCallback((f: HostedFocus) => {
    if (paths && token && session && session.host === userId) void hosted.focus(paths, f, token).then(setSession, () => {});
  }, [key, token, session?.host, userId]);
  const handOver = useCallback((to: string) => {
    if (paths && token) void hosted.handOver(paths, to, token).then(setSession, () => {});
  }, [key, token]);
  // the standup's session is started by the standup itself: just mark ourselves joined
  const joinStarted = useCallback(() => { setFollowing(true); setJoined(true); void join().catch(() => {}); }, [join]);

  return { session, me: userId ?? null, joined, role: roleIn(session, userId, joined), following, setFollowing, start, join, joinStarted, leave, end, focus, handOver };
}
