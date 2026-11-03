'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { GiftIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/settings-card';
import { Button } from '@/components/ui/button';
import { ApiError, billing, type LaunchOffer } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { stripeRedirect } from '@/lib/server/stripe-redirect';

// The launch offer (TL-775): an org staff sent it to can have Pro free for a year. Admins claim it
// here; members are told to ask one. Once claimed, it says when the free year ends and how to keep
// Pro (a card, through the billing portal). Behind the launch-offer flag; nothing shows otherwise.

// offerShown: whether the card has anything to say: an offer to claim, or a free year still running.
export function offerShown(o: LaunchOffer | null, now = new Date()): boolean {
  if (!o) return false;
  if (o.claimed) return !!o.trial_ends_at && new Date(o.trial_ends_at) > now;
  return o.eligible;
}

export function claimError(i18n: I18n, err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return i18n._(msg`Your organization has already claimed its free year, or it’s already on a paid plan.`);
  if (err instanceof ApiError && err.status === 403) return i18n._(msg`Only organization admins can claim the free year.`);
  if (err instanceof ApiError && err.status === 404) return i18n._(msg`The free year isn’t available any more.`);
  return i18n._(msg`Couldn’t claim the free year. Please try again.`);
}

export function LaunchOfferView({ offer, busy = false, error = '', onClaim, onCard }: {
  offer: LaunchOffer; busy?: boolean; error?: string; onClaim: () => void; onCard: () => void;
}) {
  const { t, i18n } = useLingui();
  // the anchor the offer's notice scrolls to (?offer=1)
  const alert = <><span id="launch-offer" />{error && <span role="alert" className="mt-2 block text-destructive">{error}</span>}</>;
  if (offer.claimed && offer.trial_ends_at) {
    const until = dates(i18n, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(offer.trial_ends_at));
    return (
      <SettingsCard icon={GiftIcon} title={t`Your free year of Pro`}
        description={<>{t`Pro is free until ${until}. To keep Pro after that, add a card before then; otherwise your organization moves to Free. We’ll remind you 30 days and 7 days before.`}{alert}</>}>
        {offer.admin && <Button size="sm" variant="outline" disabled={busy} onClick={onCard}>{t`Add a card to keep Pro`}</Button>}
      </SettingsCard>
    );
  }
  return (
    <SettingsCard icon={GiftIcon} title={t`A free year of Pro`}
      description={<>
        {t`Your organization has been offered Pro free for a year, with no card needed. Claim it and you’re on Pro straight away.`}
        {!offer.admin && ' ' + t`Ask an organization admin to claim it.`}
        {alert}
      </>}>
      {offer.admin && <Button size="sm" disabled={busy} onClick={onClaim}>{busy ? t`Claiming…` : t`Claim a free year of Pro`}</Button>}
    </SettingsCard>
  );
}

// LaunchOfferCard loads the offer while the flag is on; onClaimed lets the plan card show Pro.
export function LaunchOfferCard({ token, onClaimed }: { token: string; onClaimed: () => void }) {
  const { i18n } = useLingui();
  const { is } = useFlags();
  const on = is('launch-offer').enabled();
  const linked = useSearchParams().get('offer') === '1'; // from the offer's notice
  const [offer, setOffer] = useState<LaunchOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (on) billing.launchOffer(token).then(setOffer, () => setOffer(null));
  }, [on]); // load once the flag is known; token refreshes must not refetch

  useEffect(() => {
    if (linked && offerShown(offer)) document.getElementById('launch-offer')?.scrollIntoView({ block: 'center' });
  }, [linked, offer !== null]);

  async function claim() {
    setBusy(true);
    setError('');
    try {
      setOffer(await billing.claimLaunchOffer(token));
      onClaimed();
    } catch (err) {
      setError(claimError(i18n, err));
    } finally {
      setBusy(false);
    }
  }

  async function card() {
    setBusy(true);
    setError('');
    try {
      stripeRedirect((await billing.portal(token)).url);
    } catch {
      setError(i18n._(msg`Couldn’t reach billing. Please try again.`));
      setBusy(false);
    }
  }

  if (!on || !offer || !offerShown(offer)) return null;
  return <LaunchOfferView offer={offer} busy={busy} error={error} onClaim={() => void claim()} onCard={() => void card()} />;
}
