'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, billing } from '@/lib/api';

// atProjectLimit: creating a project failed because the free plan's one project is taken (402).
export const atProjectLimit = (err: unknown) => err instanceof ApiError && err.status === 402;

// UpgradeDialog: what the free plan includes, and the way to checkout.
export function UpgradeDialog({ open, onOpenChange, token }: { open: boolean; onOpenChange: (o: boolean) => void; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
          <DialogTitle>Your free plan includes one project</DialogTitle>
          <DialogDescription>Add as many team boards and roadmaps as you like inside it, or upgrade for unlimited projects.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button onClick={upgrade} disabled={busy}>{busy ? 'Opening checkout…' : 'Upgrade'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
