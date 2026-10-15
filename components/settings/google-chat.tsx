'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ApiError, googleChat, type ChatKind, type ChatSpace } from '@/lib/api';

// The notifications a space can get, in the order they're offered. @mentions aren't here: they're personal.
export const CHAT_KINDS: { kind: ChatKind; label: string }[] = [
  { kind: 'created', label: 'New tickets' },
  { kind: 'review', label: 'Needs review' },
  { kind: 'approval', label: 'Planned sprint needs approval' },
  { kind: 'over_capacity', label: 'Sprint started over capacity' },
  { kind: 'finished', label: 'Ticket finished' },
  { kind: 'wont_do', label: 'Closed as won’t do' },
  { kind: 'assigned', label: 'Ticket assigned (“assigned TL-12 to Sam”)' },
  { kind: 'sent_back', label: 'Sent back from review' },
  { kind: 'retention', label: 'Files due for deletion' },
];

const chatError = (err: unknown, fallback: string) =>
  err instanceof ApiError && (err.status === 400 || err.status === 502) ? err.message : err instanceof ApiError && err.status === 403 ? 'Only organization admins can change this.' : fallback;

// GoogleChatSettings: post notifications into a Google Chat space (TL-288), the project's (projectId)
// or the whole organization's. Admins set it up; everyone sees whether it is.
export function GoogleChatSettings({ token, projectId, canManage }: { token: string; projectId?: string; canManage: boolean }) {
  const [space, setSpace] = useState<ChatSpace | null>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => googleChat.get(token, projectId).then(setSpace, () => setSpace({ connected: false, kinds: [] }));
  useEffect(() => { void load(); }, [projectId]); // token refreshes must not refetch

  async function run(what: string, action: () => Promise<unknown>, done: string, failed: string) {
    setBusy(what);
    setNote(null);
    try {
      await action();
      await load();
      setNote({ ok: true, text: done });
    } catch (err) {
      setNote({ ok: false, text: chatError(err, failed) });
    } finally {
      setBusy('');
    }
  }
  return (
    <GoogleChatView space={space} canManage={canManage} busy={busy} note={note} scope={projectId ? 'project' : 'organization'}
      onSave={(url, kinds) => run('save', () => googleChat.set({ project_id: projectId, url: url || undefined, kinds }, token), 'Saved.', 'Couldn’t save. Please try again.')}
      onTest={() => run('test', () => googleChat.test(token, projectId), 'Test message sent: check the space.', 'Couldn’t send the test message.')}
      onRemove={() => confirm('Stop posting to this Google Chat space?') && run('remove', () => googleChat.remove(token, projectId), 'Removed.', 'Couldn’t remove it.')} />
  );
}

// GoogleChatView: the space's status and settings (pure, for tests).
export function GoogleChatView({ space, canManage, busy, note, scope, onSave, onTest, onRemove }: {
  space: ChatSpace | null; canManage: boolean; busy: string; note: { ok: boolean; text: string } | null; scope: 'project' | 'organization';
  onSave: (url: string, kinds: ChatKind[]) => void; onTest: () => void; onRemove: () => void;
}) {
  const [url, setUrl] = useState('');
  const [kinds, setKinds] = useState<ChatKind[] | null>(null);
  const chosen = kinds ?? space?.kinds ?? [];
  const connected = !!space?.connected;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(url.trim(), chosen);
    setUrl('');
  }
  if (space === null) return <p role="status" className="text-sm text-muted-foreground">Checking…</p>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {connected ? <Badge>Posting to a space</Badge> : <Badge variant="outline">Not set up</Badge>}
        <span className="text-xs text-muted-foreground">
          {scope === 'project' ? 'This project’s events go to this space.' : 'Every project’s events go to this space.'}
        </span>
      </div>
      {canManage ? (
        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>{connected ? 'Replace webhook URL' : 'Webhook URL'} <span className="font-normal text-muted-foreground">{connected ? '(optional)' : ''}</span></span>
            <Input type="password" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://chat.googleapis.com/v1/spaces/…" required={!connected} />
            <span className="text-xs font-normal text-muted-foreground">In the Google Chat space: Apps &amp; integrations → Webhooks → Add webhook, then copy its URL. It’s stored encrypted and never shown again.</span>
          </label>
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 font-medium">Post these</legend>
            {CHAT_KINDS.map(({ kind, label }) => (
              <label key={kind} className="flex items-center gap-2">
                <Checkbox checked={chosen.includes(kind)} aria-label={label}
                  onCheckedChange={(on) => setKinds(on ? [...chosen, kind] : chosen.filter((k) => k !== kind))} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!!busy || (!connected && !url.trim())}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
            {connected && <Button type="button" variant="outline" disabled={!!busy} onClick={onTest}>{busy === 'test' ? 'Sending…' : 'Send test message'}</Button>}
            {connected && <Button type="button" variant="ghost" className="text-destructive" disabled={!!busy} onClick={onRemove}>Remove</Button>}
          </div>
        </form>
      ) : (
        !connected && <p className="text-sm text-muted-foreground">An organization admin can connect a Google Chat space here.</p>
      )}
      {note && <p role={note.ok ? 'status' : 'alert'} className={`text-sm ${note.ok ? 'text-muted-foreground' : 'text-destructive'}`}>{note.text}</p>}
    </div>
  );
}
