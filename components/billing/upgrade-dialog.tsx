'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, billing, type Subscription } from '@/lib/api';
import { PLAN_NAMES, planOf, projectsText } from '@/lib/plans';
import { planActions } from './plan-card';

// atProjectLimit: creating a project failed because the plan's project limit is reached (402).
export const atProjectLimit = (err: unknown) => err instanceof ApiError && err.status === 402;

// UpgradeDialog: the plan's project limit, and the plans above it (TL-290): Free checks out Pro or
// Enterprise, Pro moves to Enterprise. Members are told to ask an admin, since the plan is the
// organization's (TL-243). plan: known up front (tests), otherwise read when the dialog opens.
export function UpgradeDialog({ open, onOpenChange, token, plan: known }: { open: boolean; onOpenChange: (o: boolean) => void; token: string; plan?: Subscription }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<Subscription | undefined>(known);
  useEffect(() => {
    if (open && known === undefined) billing.status(token).then(setPlan, () => setPlan({ paid: false, project_limit: 1, can_manage: false }));
  }, [open]);
  const actions = plan ? planActions(plan).filter((a) => a.kind !== 'manage') : [];
  async function upgrade(a: (typeof actions)[number]) {
    setBusy(true);
    try {
      if (a.kind === 'checkout') {
        window.location.href = (await billing.checkout(token, a.plan)).url;
        return;
      }
      await billing.changePlan(a.plan, token);
      onOpenChange(false);
    } catch {
      setError('Upgrades are unavailable right now. Please try again later.');
    }
    setBusy(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? `Your organization’s ${PLAN_NAMES[planOf(plan)]} plan includes ${projectsText(plan.project_limit).toLowerCase()}` : 'You’ve reached your plan’s projects'}</DialogTitle>
          <DialogDescription>
            Add as many team boards and roadmaps as you like inside them. Pro has 5 projects; Enterprise is unlimited.
            {plan?.can_manage === false && ' Ask an organization admin to upgrade.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{plan && !actions.length ? 'OK' : 'Not now'}</Button>
          {actions.map((a, i) => (
            <Button key={a.label} variant={i === actions.length - 1 ? 'default' : 'outline'} onClick={() => upgrade(a)} disabled={busy}>{a.label}</Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
