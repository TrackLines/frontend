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
    if (err.status === 409) return action === 'checkout'
      ? 'You’re already subscribed — use Manage billing to change your plan.'
      : 'There’s no subscription to manage yet — upgrade first.';
  }
  return 'Couldn’t reach billing. Please try again.';
}

// PlanCard shows the current plan and the way to change it (Stripe checkout / customer portal).
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
        <h2 className="text-lg font-semibold">Plan</h2>
        <Badge variant={plan.paid ? 'default' : 'secondary'}>{plan.paid ? 'Pro' : 'Free'}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {plan.paid
          ? 'Unlimited projects, boards and roadmaps.'
          : `${plan.project_limit} project with unlimited boards and roadmaps. Upgrade for unlimited projects.`}
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4">
        {plan.paid ? (
          <Button variant="outline" disabled={busy} onClick={() => go('portal')}>{busy ? 'Opening…' : 'Manage billing'}</Button>
        ) : (
          <Button disabled={busy} onClick={() => go('checkout')}>{busy ? 'Opening checkout…' : 'Upgrade to Pro'}</Button>
        )}
      </div>
    </div>
  );
}
