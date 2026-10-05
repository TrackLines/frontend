'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

// useToken returns a Clerk session token that stays fresh. Clerk tokens live ~60s and the
// board components take `token: string`, so we re-fetch on an interval and re-render.
// ponytail: interval refresh; pass getToken into components instead if they get refactored.
export function useToken(): string | null {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (!isSignedIn) return;
    let live = true;
    const refresh = () => getToken().then((t) => live && setToken(t));
    refresh();
    const id = setInterval(refresh, 45_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [getToken, isSignedIn]);
  return token;
}
