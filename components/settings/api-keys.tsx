import { Button } from '@/components/ui/button';
import type { ApiKey, ApiKeyKind } from '@/lib/api';

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export type FreshKeyInfo = { name: string; kind: ApiKeyKind; key: string };

// splitSecret: a newly created key's secret is shown once and never kept with the list.
export function splitSecret(created: ApiKey & { key: string }): { listed: ApiKey; secret: string } {
  const { key, ...listed } = created;
  return { listed, secret: key };
}

// FreshKey: the one time the secret is shown, with copy.
export function FreshKey({ fresh, copied, onCopy }: { fresh: FreshKeyInfo; copied: boolean; onCopy: () => void }) {
  return (
    <div role="status" className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="mb-2 font-medium">{fresh.kind === 'ai' ? 'AI key' : 'Service key'} for “{fresh.name}” — copy it now, it won&apos;t be shown again.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 text-sm">{fresh.key}</code>
        <Button size="sm" onClick={onCopy}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>
    </div>
  );
}

// ApiKeyList: my keys by name, kind, prefix and last use; never the secret.
export function ApiKeyList({ list, onRevoke }: { list: ApiKey[]; onRevoke: (k: ApiKey) => void }) {
  if (list.length === 0) return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No keys yet.</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {list.map((k) => (
        <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
          <span className="font-medium">{k.name}</span>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{k.kind === 'ai' ? 'AI agent' : 'Server / API'}</span>
          <code className="text-sm text-muted-foreground">{k.prefix}…</code>
          <span className="text-sm text-muted-foreground">{k.last_used_at ? `last used ${when.format(new Date(k.last_used_at))}` : 'never used'}</span>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => onRevoke(k)}>Revoke</Button>
        </li>
      ))}
    </ul>
  );
}
