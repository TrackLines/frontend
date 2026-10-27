'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

// Shared across pages so a page you navigate to can fetch on its first render instead of
// waiting for getToken(). Its age doesn't matter: in the browser api() swaps in a live Clerk
// token per request, so callers' token only says "signed in".
let last: { token: string; at: number } | null = null;
const fresh = () => last?.token ?? null;

// useToken returns a Clerk session token that stays fresh. Clerk tokens live ~60s and the
// board components take `token: string`, so we re-fetch on an interval and re-render.
// ponytail: interval refresh; pass getToken into components instead if they get refactored.
export function useToken(): string | null {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(fresh);
  useEffect(() => {
    if (!isSignedIn) {
      if (isSignedIn === false) last = null; // signed out: never reuse the old session's token
      return;
    }
    let live = true;
    const refresh = () => getToken().then((t) => {
      if (t) last = { token: t, at: Date.now() };
      if (live) setToken(t);
    });
    refresh();
    const id = setInterval(refresh, 45_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [getToken, isSignedIn]);
  return token;
}
