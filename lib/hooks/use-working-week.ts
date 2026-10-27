'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { workingWeek, type WorkWeeks } from '../api';

// The org's working week and its projects' own (TL-510), fetched once per tab and shared by every timebox
// countdown. Until it's here (or if it can't be read) countdowns use the default week. Cleared when the
// person or organization changes (page-cache), and when a setting is saved (setWorkingWeeks).
let weeks: WorkWeeks | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function setWorkingWeeks(next: WorkWeeks | null) {
  weeks = next;
  listeners.forEach((l) => l());
}

export function forgetWorkingWeeks() {
  setWorkingWeeks(null);
}

export function useWorkingWeeks(token: string | null | undefined): WorkWeeks | null {
  useEffect(() => {
    if (!token || weeks !== null || loading) return;
    loading = workingWeek.get(token).then(setWorkingWeeks, () => {}).finally(() => { loading = null; });
  }, [token != null]); // token refreshes must not refetch
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => weeks, () => null);
}
