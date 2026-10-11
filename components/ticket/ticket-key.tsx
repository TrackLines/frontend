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

export function ticketPath(ticket: { id: string; key?: string | null }) {
  return `/tickets/${ticket.key || ticket.id}`;
}

export function isTicketKey(value: string) {
  return /^[A-Z][A-Z0-9]{1,5}-\d+$/i.test(value);
}
