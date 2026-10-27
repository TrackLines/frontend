'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { tickets, type Assignee } from '../api';

// The org's people (and agents), fetched once per tab and shared by every card, ticket and comment
// that names someone. Cleared when the signed-in person or the organization changes (page-cache).
let people: Assignee[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Assignee[] | null) {
  people = next;
  listeners.forEach((l) => l());
}

export function forgetPeople() {
  set(null);
}

// usePeople returns the org's people, or null until they've loaded (then personLabel says "A teammate").
export function usePeople(token: string | null | undefined): Assignee[] | null {
  useEffect(() => {
    if (!token || people !== null || loading) return;
    loading = tickets.assignees(token).then(set, () => {}).finally(() => { loading = null; });
  }, [token != null]); // token refreshes must not refetch
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => people, () => null);
}
