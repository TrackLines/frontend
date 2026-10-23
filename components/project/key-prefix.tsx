'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, projects, type Project } from '@/lib/api';

// The prefix of the project's ticket keys (TL-123). Org admins change it; existing keys change too.
export function ProjectKeyPrefix({ project, token, editable, onChanged }: { project: Project; token: string; editable: boolean; onChanged: (prefix: string) => void }) {
  const { t } = useLingui();
  const [editing, setEditing] = useState(false);
  const [prefix, setPrefix] = useState(project.key_prefix ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await projects.update(project.id, { name: project.name, description: project.description, key_prefix: prefix.trim().toUpperCase() }, token);
      onChanged(prefix.trim().toUpperCase());
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t`That ticket prefix is already used by another project.`
        : err instanceof ApiError && err.status === 400 ? err.message : t`Couldn’t update the ticket prefix. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span><Trans>Ticket key prefix</Trans></span>
      {!editing ? <><code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{project.key_prefix ?? '—'}</code>{editable && <Button type="button" variant="ghost" size="sm" onClick={() => { setPrefix(project.key_prefix ?? ''); setEditing(true); }}><Trans>Change</Trans></Button>}</> : (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <Input aria-label={t`Ticket key prefix`} value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} minLength={2} maxLength={6} pattern="[A-Z][A-Z0-9]{1,5}" required className="w-24" />
          <span className="text-xs"><Trans>2–6 letters or digits, starting with a letter. Existing keys will change.</Trans></span>
          <Button type="submit" size="sm" disabled={saving}>{saving ? t`Saving…` : t`Save prefix`}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => { setEditing(false); setError(''); }}><Trans>Cancel</Trans></Button>
          {error && <span role="alert" className="basis-full text-destructive">{error}</span>}
        </form>
      )}
    </div>
  );
}
