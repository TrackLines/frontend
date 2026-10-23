'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { CreditCardIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsCard } from '@/components/settings/settings-card';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError, billing, type Subscription } from '@/lib/api';
import { MEMBER_LIMIT, membersText, PLAN_NAMES, planOf, projectsText } from '@/lib/plans';
import { stripeRedirect } from '@/lib/stripe-redirect';

// billingError turns checkout/portal failures into something a person can act on.
export function billingError(i18n: I18n, err: unknown, action: 'checkout' | 'portal'): string {
  if (err instanceof ApiError) {
    if (err.status === 503) return i18n._(msg`Billing isn’t set up on this server yet.`);
    if (err.status === 403) return i18n._(msg`Only organization admins can change the plan.`);
    if (err.status === 409) return action === 'checkout'
      ? i18n._(msg`Your organization is already subscribed — use Manage billing to change the plan.`)
      : i18n._(msg`There’s no subscription to manage yet — upgrade first.`);
  }
  return i18n._(msg`Couldn’t reach billing. Please try again.`);
}

// PlanAction is one way the plan card lets an org admin change the plan.
export type PlanAction = { kind: 'checkout' | 'change'; plan: 'pro' | 'enterprise'; label: string } | { kind: 'manage'; label: string };

// planActions is what the plan card offers an org admin (TL-290): Free checks out Pro or Enterprise;
// Pro (paid through Stripe) can move to Enterprise on the same subscription, or manage billing;
// Enterprise manages billing. A plan granted by hand has no billing; members change nothing (TL-243).
export function planActions(i18n: I18n, s: Subscription): PlanAction[] {
  if (s.can_manage === false) return [];
  const plan = planOf(s);
  if (plan === 'free') return [{ kind: 'checkout', plan: 'pro', label: i18n._(msg`Upgrade to Pro`) }, { kind: 'checkout', plan: 'enterprise', label: i18n._(msg`Upgrade to Enterprise`) }];
  if (s.billed === false) return [];
  const manage: PlanAction = { kind: 'manage', label: i18n._(msg`Manage billing`) };
  return plan === 'pro' ? [{ kind: 'change', plan: 'enterprise', label: i18n._(msg`Upgrade to Enterprise`) }, manage] : [manage];
}

// planText: what the organization's plan includes, and for members, who can change it.
export function planText(i18n: I18n, s: Subscription): string {
  const plan = planOf(s);
  const ask = s.can_manage === false ? ' ' + i18n._(msg`Ask an organization admin to upgrade.`) : '';
  const projects = projectsText(i18n, s.project_limit);
  const members = membersText(i18n, s.member_limit ?? (plan === 'enterprise' ? -1 : MEMBER_LIMIT));
  const proProjects = projectsText(i18n, 5).toLowerCase();
  if (plan === 'free') return i18n._(msg`${projects} and ${members}, with unlimited boards and roadmaps. Pro has ${proProjects}; Enterprise has unlimited projects and members.`) + ask;
  if (s.billed === false) return i18n._(msg`${projects} and ${members}, with boards and roadmaps. This plan was granted to your organization, so there’s no billing to manage.`);
  const includes = i18n._(msg`${projects} and ${members}, with unlimited boards and roadmaps.`);
  return plan === 'pro' ? `${includes} ${i18n._(msg`Enterprise has unlimited projects and members.`)}${ask}` : includes;
}

// PlanCard (a Settings card, so a list item) shows the organization's plan and, for its admins, the way to change it (Stripe checkout /
// customer portal).
export function PlanCard({ token }: { token: string }) {
  const { t, i18n } = useLingui();
  const [plan, setPlan] = useState<Subscription | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    billing.status(token).then(setPlan, () => setFailed(true));
  }, []); // load once; token refreshes must not refetch

  async function go(action: 'checkout' | 'portal', to: 'pro' | 'enterprise' = 'pro') {
    setBusy(true);
    setError('');
    try {
      stripeRedirect((await (action === 'checkout' ? billing.checkout(token, to) : billing.portal(token))).url);
    } catch (err) {
      setError(billingError(i18n, err, action));
      setBusy(false);
    }
  }

  // Pro → Enterprise: the same subscription, prorated by Stripe; the new limit applies straight away
  async function change(to: 'pro' | 'enterprise') {
    const name = PLAN_NAMES[to];
    if (!confirm(t`Move your organization to ${name}? Stripe adjusts this billing period's charge to match.`)) return;
    setBusy(true);
    setError('');
    try {
      await billing.changePlan(to, token);
      setPlan(await billing.status(token));
    } catch (err) {
      setError(billingError(i18n, err, 'checkout'));
    } finally {
      setBusy(false);
    }
  }

  if (failed) return <li><p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load your plan. Please refresh to try again.</Trans></p></li>;
  if (!plan) return <li><Skeleton role="status" aria-label={t`Loading plan…`} className="h-44 rounded-xl" /></li>;

  return (
    <SettingsCard icon={CreditCardIcon} title={t`Plan`} badge={<Badge variant={plan.paid ? 'default' : 'secondary'}>{PLAN_NAMES[planOf(plan)]}</Badge>}
      description={<>{planText(i18n, plan)}{error && <span role="alert" className="mt-2 block text-destructive">{error}</span>}</>}>
      {planActions(i18n, plan).map((a, i) => (
        <Button key={a.label} size="sm" variant={i === 0 && a.kind !== 'manage' ? 'default' : 'outline'} disabled={busy}
          onClick={() => void (a.kind === 'manage' ? go('portal') : a.kind === 'checkout' ? go('checkout', a.plan) : change(a.plan))}>{a.label}</Button>
      ))}
    </SettingsCard>
  );
}
