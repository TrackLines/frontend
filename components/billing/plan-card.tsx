'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError, billing, type Subscription } from '@/lib/api';

// billingError turns checkout/portal failures into something a person can act on.
export function billingError(err: unknown, action: 'checkout' | 'portal'): string {
  if (err instanceof ApiError) {
    if (err.status === 503) return 'Billing isn’t set up on this server yet.';
    if (err.status === 403) return 'Only organization admins can change the plan.';
    if (err.status === 409) return action === 'checkout'
      ? 'Your organization is already subscribed — use Manage billing to change the plan.'
      : 'There’s no subscription to manage yet — upgrade first.';
  }
  return 'Couldn’t reach billing. Please try again.';
}

// planAction is what the plan card offers an org admin: upgrade (free), manage billing (paid through
// Stripe), or nothing (a plan granted by hand has no Stripe billing to manage). Members get nothing:
// the plan is the organization's (TL-243).
export function planAction(plan: Subscription): 'upgrade' | 'manage' | null {
  if (plan.can_manage === false) return null;
  if (!plan.paid) return 'upgrade';
  return plan.billed === false ? null : 'manage';
}

// planText: what the organization's plan includes, and for members, who can change it.
export function planText(plan: Subscription): string {
  const who = plan.can_manage === false ? ' Ask an organization admin to upgrade.' : ' Upgrade for unlimited projects.';
  if (!plan.paid) return `${plan.project_limit} project with unlimited boards and roadmaps.${who}`;
  if (plan.billed === false) return 'Unlimited projects, boards and roadmaps. This plan was granted to your organization, so there’s no billing to manage.';
  return 'Unlimited projects, boards and roadmaps.';
}

// PlanCard shows the organization's plan and, for its admins, the way to change it (Stripe checkout /
// customer portal).
export function PlanCard({ token }: { token: string }) {
  const [plan, setPlan] = useState<Subscription | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    billing.status(token).then(setPlan, () => setFailed(true));
  }, []); // load once; token refreshes must not refetch

  async function go(action: 'checkout' | 'portal') {
    setBusy(true);
    setError('');
    try {
      window.location.href = (await (action === 'checkout' ? billing.checkout(token) : billing.portal(token))).url;
    } catch (err) {
      setError(billingError(err, action));
      setBusy(false);
    }
  }

  if (failed) return <p role="alert" className="text-sm text-destructive">Couldn&apos;t load your plan. Please refresh to try again.</p>;
  if (!plan) return <Skeleton role="status" aria-label="Loading plan…" className="h-36 w-full rounded-xl" />;

  return (
    <div className="rounded-xl border p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Organization plan</h2>
        <Badge variant={plan.paid ? 'default' : 'secondary'}>{plan.paid ? 'Pro' : 'Free'}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {planText(plan)}
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4">
        {planAction(plan) === null ? null : planAction(plan) === 'manage' ? (
          <Button variant="outline" disabled={busy} onClick={() => go('portal')}>{busy ? 'Opening…' : 'Manage billing'}</Button>
        ) : (
          <Button disabled={busy} onClick={() => go('checkout')}>{busy ? 'Opening checkout…' : 'Upgrade to Pro'}</Button>
        )}
      </div>
    </div>
  );
}
