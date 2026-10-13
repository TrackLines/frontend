'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, billing } from '@/lib/api';

// atProjectLimit: creating a project failed because the free plan's one project is taken (402).
export const atProjectLimit = (err: unknown) => err instanceof ApiError && err.status === 402;

// UpgradeDialog: what the free plan includes, and the way to checkout for org admins; members are
// told to ask one, since the plan is the organization's (TL-243). canManage: known up front (tests),
// otherwise read from the plan when the dialog opens.
export function UpgradeDialog({ open, onOpenChange, token, canManage: known }: { open: boolean; onOpenChange: (o: boolean) => void; token: string; canManage?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState<boolean | undefined>(known);
  useEffect(() => {
    if (open && known === undefined) billing.status(token).then((p) => setCanManage(p.can_manage !== false), () => setCanManage(false));
  }, [open]);
  async function upgrade() {
    setBusy(true);
    try {
      window.location.href = (await billing.checkout(token)).url;
    } catch {
      setError('Upgrades are unavailable right now. Please try again later.');
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your organization’s free plan includes one project</DialogTitle>
          <DialogDescription>
            Add as many team boards and roadmaps as you like inside it.{' '}
            {canManage === false ? 'For unlimited projects, ask an organization admin to upgrade.' : 'Upgrade for unlimited projects.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{canManage === false ? 'OK' : 'Not now'}</Button>
          {canManage !== false && <Button onClick={upgrade} disabled={busy || canManage === undefined}>{busy ? 'Opening checkout…' : 'Upgrade'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
