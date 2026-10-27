'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/common/copy-link';
import { Button } from '@/components/ui/button';
import { intake, type IntakeSettings } from '@/lib/api';

export const requestLink = (token: string, origin = typeof window === 'undefined' ? '' : window.location.origin) => `${origin}/request/${token}`;

// IntakeSettingsSection: the project's public request form, on Edit project: open or closed, its
// link to share, and a new link when the old one is out in the wild.
export function IntakeSettingsSection({ projectId, token }: { projectId: string; token: string }) {
  const { t } = useLingui();
  const [settings, setSettings] = useState<IntakeSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { intake.settings(projectId, token).then(setSettings, () => setError(t`Couldn’t load the request form settings.`)); }, [projectId]);

  async function change(open: boolean, rotate = false) {
    if (rotate && !confirm(t`Make a new link? The current one stops working, so anyone using it will need the new one.`)) return;
    setBusy(true);
    setError('');
    try {
      setSettings(await intake.setOpen(projectId, open, token, rotate));
    } catch {
      setError(t`Couldn’t change the request form. Please try again.`);
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
  const { t } = useLingui();
  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted-foreground">
        <Trans>Anyone with the link can send a bug report or feature request, without an account. Requests wait in the project&apos;s
        request inbox until someone adds them to the backlog or dismisses them. The form shows nothing about the project.</Trans>
      </p>
      {settings === null ? (!error && <p role="status" className="text-muted-foreground"><Trans>Loading…</Trans></p>)
        : settings.open && settings.token ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-xs select-all">{requestLink(settings.token, origin)}</code>
              <CopyButton value={requestLink(settings.token, origin)} label={t`Copy link`} size="sm" ariaLabel={t`Copy request form link`} />
            </div>
            {settings.can_manage ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onChange(true, true)}><Trans>New link</Trans></Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onChange(false)}><Trans>Close the form</Trans></Button>
              </div>
            ) : <p className="text-muted-foreground"><Trans>Only organization admins can close the form or make a new link.</Trans></p>}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">{settings.can_manage ? <Trans>The form is closed.</Trans> : <Trans>The form is closed. An organization admin can open it.</Trans>}</span>
            {settings.can_manage && <Button type="button" size="sm" disabled={busy} onClick={() => onChange(true)}>{busy ? <Trans>Opening…</Trans> : <Trans>Open the form</Trans>}</Button>}
          </div>
        )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
