'use client';

import { useEffect, useState } from 'react';
import { BellRingIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/settings-card';
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push';

// DevicePushCard: notifications on this device (Web Push), the same switch as in the bell (TL-294).
export function DevicePushCard({ token }: { token: string }) {
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void pushState(token).then(setState, () => {}); }, []); // token refreshes must not refetch
  async function toggle() {
    setBusy(true);
    try {
      setState(await (state === 'on' ? disablePush(token) : enablePush(token)));
    } catch {
      setState(await pushState(token).catch(() => 'off' as PushState));
    } finally {
      setBusy(false);
    }
  }
  return <DevicePushView state={state} busy={busy} onToggle={() => void toggle()} />;
}

// DevicePushView: pure, for tests.
export function DevicePushView({ state, busy, onToggle }: { state: PushState; busy: boolean; onToggle: () => void }) {
  const description = {
    on: 'You get notifications on this device, even when Tracklines is closed.',
    off: 'Get notifications on this device, even when Tracklines is closed.',
    blocked: 'Notifications are blocked for this site in your browser settings.',
    unavailable: 'This server doesn’t send device notifications yet.',
    unsupported: 'This browser can’t get notifications when Tracklines is closed.',
  }[state];
  return (
    <SettingsCard icon={BellRingIcon} title="This device" description={description}
      badge={state === 'on' ? <Badge>On</Badge> : <Badge variant="outline">Off</Badge>}>
      {(state === 'on' || state === 'off') && (
        <Button size="sm" variant={state === 'on' ? 'outline' : 'default'} disabled={busy} onClick={onToggle}>{busy ? '…' : state === 'on' ? 'Turn off' : 'Turn on'}</Button>
      )}
    </SettingsCard>
  );
}
