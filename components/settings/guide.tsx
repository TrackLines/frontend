'use client';

import { useAuth } from '@clerk/nextjs';
import { Trans, useLingui } from '@lingui/react/macro';
import { CompassIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SettingsCard } from '@/components/settings/settings-card';
import { Button } from '@/components/ui/button';
import { GUIDE_RESET, requestGuideReset } from '@/lib/org/onboarding';

export function GuideSettings({ token }: { token: string }) {
  const { orgId, userId } = useAuth();
  return orgId && userId ? <PersonalGuideSettings key={`${orgId}:${userId}`} token={token} orgId={orgId} userId={userId} /> : null;
}

function PersonalGuideSettings({ token, orgId, userId }: { token: string; orgId: string; userId: string }) {
  const { t } = useLingui();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function resetGuide() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(''); setReset(false);
    try {
      await requestGuideReset(orgId, userId, token, (detail) => {
        if (mounted.current) window.dispatchEvent(new CustomEvent(GUIDE_RESET, { detail }));
      });
      if (mounted.current) setReset(true);
    } catch { if (mounted.current) setError(t`Couldn’t reset the guide. Please try again.`); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  return <GuideSettingsView busy={busy} error={error} reset={reset} onReset={resetGuide} />;
}

export function GuideSettingsView({ busy, error, reset, onReset }: { busy: boolean; error: string; reset: boolean; onReset: () => void }) {
  const { t } = useLingui();
  return <SettingsCard icon={CompassIcon} title={t`Guide`} description={t`Reset your guide progress for this organization to show the Guide button again.`}>
    <Button variant="outline" size="sm" disabled={busy} onClick={onReset}>{busy ? <Trans>Resetting…</Trans> : <Trans>Reset guide</Trans>}</Button>
    {reset && <p role="status" className="w-full text-sm text-muted-foreground"><Trans>Guide progress reset for this organization.</Trans></p>}
    {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
  </SettingsCard>;
}
