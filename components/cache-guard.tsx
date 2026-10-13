'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { forgetAllCached, switched } from '@/lib/page-cache';

// CacheGuard drops every cached page when the signed-in user changes, sign-out included, so on a
// shared computer the next person never sees the last one's boards or tickets. Always mounted
// (the org switcher, which clears on org changes, unmounts on sign-out).
export function CacheGuard() {
  const { userId, isLoaded } = useAuth();
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    if (switched(seen.current, userId ?? null)) forgetAllCached();
    seen.current = userId ?? null;
  }, [userId, isLoaded]);
  return null;
}
