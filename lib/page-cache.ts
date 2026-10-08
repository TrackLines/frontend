'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

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
