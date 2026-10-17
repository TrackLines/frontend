'use client';

import { useEffect, useState } from 'react';
import { BellRingIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/settings-card';
import { disablePush, enablePush, pushFailure, pushState, type PushState } from '@/lib/push';

// DevicePushCard: notifications on this device (Web Push), the same switch as in the bell (TL-294).
export function DevicePushCard({ token }: { token: string }) {
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void pushState(token).then(setState, () => {}); }, []); // token refreshes must not refetch
  async function toggle() {
    setBusy(true);
    setError('');
    try {
      setState(await (state === 'on' ? disablePush(token) : enablePush(token)));
    } catch (err) {
      setError(pushFailure(err));
      setState(await pushState(token).catch(() => 'off' as PushState));
    } finally {
      setBusy(false);
    }
  }
  return <DevicePushView state={state} busy={busy} error={error} onToggle={() => void toggle()} />;
}

// DevicePushView: pure, for tests. Shown only when there's something you can do: turn it on or off, or
// unblock it in your browser (TL-392), the same as the bell. Not while it's checking, when the server
// doesn't send device notifications, or in a browser that can't get them.
export function DevicePushView({ state, busy, error = '', onToggle }: { state: PushState; busy: boolean; error?: string; onToggle: () => void }) {
  if (state !== 'on' && state !== 'off' && state !== 'blocked') return null;
  const description = {
    on: 'You get notifications on this device, even when TrackLin.es is closed.',
    off: 'Get notifications on this device, even when TrackLin.es is closed.',
    blocked: 'Notifications are blocked for this site in your browser settings.',
  }[state];
  return (
    <SettingsCard icon={BellRingIcon} title="This device" description={description}
      badge={state === 'on' ? <Badge>On</Badge> : <Badge variant="outline">Off</Badge>}>
      {(state === 'on' || state === 'off') && (
        <Button size="sm" variant={state === 'on' ? 'outline' : 'default'} disabled={busy} onClick={onToggle}>{busy ? '…' : state === 'on' ? 'Turn off' : 'Turn on'}</Button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SettingsCard>
  );
}
