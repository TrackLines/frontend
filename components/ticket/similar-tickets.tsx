'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { tickets, type TicketSearchResult } from '@/lib/api';

// similarQuery: what a new ticket's title searches for possible duplicates with, or null while it's too
// short to mean anything. One real word is enough ("Pagination" used to need a second word, so a short
// title never searched at all); at most the first five are used.
export function similarQuery(title: string): string | null {
  const words = title.trim().split(/\s+/).filter((word) => word.length >= 3);
  return words.length > 0 && title.trim().length >= 4 ? words.slice(0, 5).join(' ') : null;
}

// useSimilarTickets: tickets in the project that look like the title being typed, for every form that
// files a new ticket (board, backlog, the header's New ticket; TL-275). Any word may match, best first,
// so a typo ("seperate") doesn't hide "separate". Off (empty) when active is false, e.g. editing.
export function useSimilarTickets(title: string, projectId: string | undefined, token: string | null | undefined, active = true): TicketSearchResult[] {
  const [found, setFound] = useState<TicketSearchResult[]>([]);
  useEffect(() => {
    const text = similarQuery(title);
    if (!active || !projectId || !token || !text) {
      setFound([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void tickets.search({ text, project: projectId, limit: 5, match: 'any' }, token).then(
        (list) => { if (!cancelled) setFound(list.filter((t) => !t.duplicate_of_id)); },
        () => { if (!cancelled) setFound([]); },
      );
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, projectId, title, token != null]); // token refreshes must not search again
  return found;
}

// SimilarTickets: possible duplicates of the title being typed, so nobody files the same thing twice.
// Once the details are being written they've decided it's new, so the list gets out of the way.
export function SimilarTickets({ suggestions, description }: { suggestions: TicketSearchResult[]; description: string }) {
  if (suggestions.length === 0 || description.trim() !== '') return null;
  return (
    <div className="-mt-3 grid gap-1 text-xs text-muted-foreground">Similar tickets in this project:
      {suggestions.map((s) => <Link key={s.id} href={ticketPath(s)} className="hover:underline"><TicketKey value={s.key} /> {s.title}</Link>)}
    </div>
  );
}
