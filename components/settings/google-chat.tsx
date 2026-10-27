'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/common/copy-link';
import { ApiError, googleChat, type ChatKind, type ChatSpace } from '@/lib/api';
import { CHAT_KINDS } from '@/lib/org/google-chat';

export { CHAT_KINDS }; // the form's own list, kept in lib/google-chat for the docs

const chatError = (i18n: I18n, err: unknown, fallback: string) =>
  err instanceof ApiError && (err.status === 400 || err.status === 502) ? err.message : err instanceof ApiError && err.status === 403 ? i18n._(msg`Only organization admins can change this.`) : fallback;

// CHAT_AVATAR_URL: our logo, for the webhook's optional Avatar URL so posts show it (and the Chat app's, TL-289).
export const CHAT_AVATAR_URL = 'https://tracklin.es/tracklines-github.png';

// GoogleChatSettings: post notifications into a Google Chat space (TL-288), the project's (projectId)
// or the whole organization's. Admins set it up; everyone sees whether it is.
export function GoogleChatSettings({ token, projectId, canManage }: { token: string; projectId?: string; canManage: boolean }) {
  const { t, i18n } = useLingui();
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
      setNote({ ok: false, text: chatError(i18n, err, failed) });
    } finally {
      setBusy('');
    }
  }
  return (
    <GoogleChatView space={space} canManage={canManage} busy={busy} note={note} scope={projectId ? 'project' : 'organization'}
      onSave={(url, kinds) => run('save', () => googleChat.set({ project_id: projectId, url: url || undefined, kinds }, token), t`Saved.`, t`Couldn’t save. Please try again.`)}
      onTest={() => run('test', () => googleChat.test(token, projectId), t`Test message sent: check the space.`, t`Couldn’t send the test message.`)}
      onRemove={() => confirm(t`Stop posting to this Google Chat space?`) && run('remove', () => googleChat.remove(token, projectId), t`Removed.`, t`Couldn’t remove it.`)} />
  );
}

// GoogleChatView: the space's status and settings (pure, for tests).
export function GoogleChatView({ space, canManage, busy, note, scope, onSave, onTest, onRemove }: {
  space: ChatSpace | null; canManage: boolean; busy: string; note: { ok: boolean; text: string } | null; scope: 'project' | 'organization';
  onSave: (url: string, kinds: ChatKind[]) => void; onTest: () => void; onRemove: () => void;
}) {
  const { t, i18n } = useLingui();
  const [url, setUrl] = useState('');
  const [kinds, setKinds] = useState<ChatKind[] | null>(null);
  const chosen = kinds ?? space?.kinds ?? [];
  const connected = !!space?.connected;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(url.trim(), chosen);
    setUrl('');
  }
  if (space === null) return <p role="status" className="text-sm text-muted-foreground"><Trans>Checking…</Trans></p>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {connected ? <Badge><Trans>Posting to a space</Trans></Badge> : <Badge variant="outline"><Trans>Not set up</Trans></Badge>}
        <span className="text-xs text-muted-foreground">
          {scope === 'project' ? <Trans>This project’s events go to this space.</Trans> : <Trans>Every project’s events go to this space.</Trans>}
        </span>
      </div>
      {canManage ? (
        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>{connected ? <Trans>Replace webhook URL</Trans> : <Trans>Webhook URL</Trans>} <span className="font-normal text-muted-foreground">{connected ? <Trans>(optional)</Trans> : ''}</span></span>
            <Input type="password" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://chat.googleapis.com/v1/spaces/…" required={!connected} />
            <span className="text-xs font-normal text-muted-foreground"><Trans>In the Google Chat space: Apps &amp; integrations → Webhooks → Add webhook, then copy its URL. It’s stored encrypted and never shown again.</Trans></span>
          </label>
          <div className="grid gap-1.5 text-sm font-medium">
            <span><Trans>Avatar URL <span className="font-normal text-muted-foreground">(paste it when adding the webhook, so posts show our logo)</span></Trans></span>
            <div className="flex gap-2">
              <Input readOnly value={CHAT_AVATAR_URL} aria-label={t`Avatar URL`} onFocus={(e) => e.currentTarget.select()} />
              <CopyButton value={CHAT_AVATAR_URL} label={t`Copy`} ariaLabel={t`Copy avatar URL`} />
            </div>
          </div>
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 font-medium"><Trans>Post these</Trans></legend>
            {CHAT_KINDS.map(({ kind, label }) => (
              <label key={kind} className="flex items-center gap-2">
                <Checkbox checked={chosen.includes(kind)} aria-label={i18n._(label)}
                  onCheckedChange={(on) => setKinds(on ? [...chosen, kind] : chosen.filter((k) => k !== kind))} />
                {i18n._(label)}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!!busy || (!connected && !url.trim())}>{busy === 'save' ? <Trans>Saving…</Trans> : <Trans>Save</Trans>}</Button>
            {connected && <Button type="button" variant="outline" disabled={!!busy} onClick={onTest}>{busy === 'test' ? <Trans>Sending…</Trans> : <Trans>Send test message</Trans>}</Button>}
            {connected && <Button type="button" variant="ghost" className="text-destructive" disabled={!!busy} onClick={onRemove}><Trans>Remove</Trans></Button>}
          </div>
        </form>
      ) : (
        !connected && <p className="text-sm text-muted-foreground"><Trans>An organization admin can connect a Google Chat space here.</Trans></p>
      )}
      {note && <p role={note.ok ? 'status' : 'alert'} className={`text-sm ${note.ok ? 'text-muted-foreground' : 'text-destructive'}`}>{note.text}</p>}
    </div>
  );
}
