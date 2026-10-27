'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { forgetPeople } from '../hooks/use-people';
import { forgetWorkingWeeks } from '../hooks/use-working-week';

// Last-seen data per page (in memory, this tab only), so going back to a board/ticket/project
// shows it instantly while the page refreshes it in the background.
// ponytail: unbounded Map of a few small JSON objects per visited page; cap it if tabs live for days.
const cache = new Map<string, unknown>();

// useCachedState is useState seeded from (and mirrored into) the cache under key.
export function useCachedState<T>(key: string): [T | null, Dispatch<SetStateAction<T | null>>] {
  const [value, setValue] = useState<T | null>(() => (cache.get(key) as T | undefined) ?? null);
  useEffect(() => {
    if (value !== null) cache.set(key, value);
  }, [key, value]);
  return [value, setValue];
}

export function forgetCached(key: string) {
  cache.delete(key);
}

// prefetch warms key for a page the user is likely to open next, so its first visit is instant
// too (it still refreshes on mount). No-op if already cached; failures are ignored.
export function prefetch<T>(key: string, load: () => Promise<T>) {
  if (cache.has(key)) return;
  load().then((v) => { cache.set(key, v); }, () => {});
}

// forgetAllCached drops every cached page, e.g. when the active organization changes.
export function forgetAllCached() {
  cache.clear();
  forgetPeople(); // another person or org: another people list
  forgetWorkingWeeks(); // and another working week
}

// switched: the signed-in person or active org changed from one we'd seen (not the first load), so
// pages cached for the old one must go. undefined = not seen yet; null = signed out.
export const switched = (seen: string | null | undefined, now: string | null | undefined) => seen !== undefined && seen !== now;
