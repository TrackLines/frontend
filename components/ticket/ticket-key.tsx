import { CopyButton } from '@/components/copy-link';

export function TicketKey({ value, copy = false }: { value?: string | null; copy?: boolean }) {
  if (!value) return null;
  return (
    // never squeezed or broken at the hyphen (TL- / 113)
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
      <code className="font-mono">{value}</code>
      {copy && <CopyButton value={value} label="Copy key" size="sm" ariaLabel={`Copy ticket key ${value}`} className="h-6 px-1.5" />}
    </span>
  );
}

// ticketPath links a ticket by its id, never its key: keys are per organization, so another org (or
// another of yours) can have its own TL-12, and a shared key link would open that one (TL-276).
export function ticketPath(ticket: { id: string }) {
  return `/tickets/${ticket.id}`;
}

// linkTitle names a ticket's short link (TL-277): its key, never its title, since anyone can look a
// short link's title up.
export function linkTitle(ticket: { key?: string | null }) {
  return ticket.key ? `${ticket.key} on TrackLin.es` : 'A ticket on TrackLin.es';
}

export function isTicketKey(value: string) {
  return /^[A-Z][A-Z0-9]{1,5}-\d+$/i.test(value);
}
