'use client';

import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/copy-link';
import { Button } from '@/components/ui/button';
import { intake, type IntakeSettings } from '@/lib/api';

export const requestLink = (token: string, origin = typeof window === 'undefined' ? '' : window.location.origin) => `${origin}/request/${token}`;

// IntakeSettingsSection: the project's public request form, on Edit project: open or closed, its
// link to share, and a new link when the old one is out in the wild.
export function IntakeSettingsSection({ projectId, token }: { projectId: string; token: string }) {
  const [settings, setSettings] = useState<IntakeSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { intake.settings(projectId, token).then(setSettings, () => setError('Couldn’t load the request form settings.')); }, [projectId]);

  async function change(open: boolean, rotate = false) {
    if (rotate && !confirm('Make a new link? The current one stops working, so anyone using it will need the new one.')) return;
    setBusy(true);
    setError('');
    try {
      setSettings(await intake.setOpen(projectId, open, token, rotate));
    } catch {
      setError('Couldn’t change the request form. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <IntakeSettingsView settings={settings} busy={busy} error={error} onChange={(open, rotate) => void change(open, rotate)} />;
}

// IntakeSettingsView: pure, for tests.
export function IntakeSettingsView({ settings, busy, error, onChange, origin }: {
  settings: IntakeSettings | null; busy: boolean; error: string; onChange: (open: boolean, rotate?: boolean) => void; origin?: string;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted-foreground">
        Anyone with the link can send a bug report or feature request, without an account. Requests wait in the project&apos;s
        request inbox until someone adds them to the backlog or dismisses them. The form shows nothing about the project.
      </p>
      {settings === null ? (!error && <p role="status" className="text-muted-foreground">Loading…</p>)
        : settings.open && settings.token ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-xs select-all">{requestLink(settings.token, origin)}</code>
              <CopyButton value={requestLink(settings.token, origin)} label="Copy link" size="sm" ariaLabel="Copy request form link" />
            </div>
            {settings.can_manage ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onChange(true, true)}>New link</Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onChange(false)}>Close the form</Button>
              </div>
            ) : <p className="text-muted-foreground">Only organization admins can close the form or make a new link.</p>}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">The form is closed.{!settings.can_manage && ' An organization admin can open it.'}</span>
            {settings.can_manage && <Button type="button" size="sm" disabled={busy} onClick={() => onChange(true)}>{busy ? 'Opening…' : 'Open the form'}</Button>}
          </div>
        )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
