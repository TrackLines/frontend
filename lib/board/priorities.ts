'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useEffect, useState } from 'react';
import { priorityLevels, type PriorityLevel } from '@/lib/api';

// The priority levels, most urgent first (TL-847): from GET /api/priorities, so a level the backend adds
// later shows up without a release; until it answers (or if it can't), the four that ship today.
export const DEFAULT_PRIORITIES: PriorityLevel[] = [
  { key: 'urgent', name: 'Urgent' }, { key: 'high', name: 'High' }, { key: 'medium', name: 'Medium' }, { key: 'low', name: 'Low' },
];

const NAMES = { urgent: msg`Urgent`, high: msg`High`, medium: msg`Medium`, low: msg`Low` } as const;

// priorityName: today's levels in the reader's language; one we don't know yet by its API name.
export function priorityName(i18n: I18n, level: PriorityLevel): string {
  const known = NAMES[level.key as keyof typeof NAMES];
  return known ? i18n._(known) : level.name;
}

let loaded: Promise<PriorityLevel[]> | null = null; // once per page load

// usePriorities: the levels for a signed-in caller's token; without one (tests, signed out), today's four.
export function usePriorities(token?: string | null): PriorityLevel[] {
  const [levels, setLevels] = useState(DEFAULT_PRIORITIES);
  useEffect(() => {
    if (!token) return;
    loaded ??= priorityLevels.list(token).catch(() => { loaded = null; return DEFAULT_PRIORITIES; });
    let live = true;
    void loaded.then((l) => { if (live && l.length) setLevels(l); });
    return () => { live = false; };
  }, [token !== null]); // token refreshes must not refetch
  return levels;
}
