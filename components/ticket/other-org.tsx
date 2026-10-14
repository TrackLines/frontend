'use client';

import { useOrganizationList } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';

// ElsewhereView: a ticket link opened while another of your organizations is active (TL-276): say
// where it is and offer to switch, rather than "not found" (pure, for tests).
export function ElsewhereView({ orgName, switching, onSwitch }: { orgName: string; switching: boolean; onSwitch: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">This ticket is in {orgName}</h1>
      <p className="text-muted-foreground">You&apos;re working in a different organization right now. Switch to {orgName} to open it.</p>
      <div className="flex gap-2">
        <Button onClick={onSwitch} disabled={switching}>{switching ? 'Switching…' : `Switch to ${orgName}`}</Button>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Back to projects</Link>
      </div>
    </main>
  );
}

// Elsewhere switches the active organization (Clerk) and reopens the ticket there.
export function Elsewhere({ orgId }: { orgId: string }) {
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: true });
  const [switching, setSwitching] = useState(false);
  const org = userMemberships.data?.find((m) => m.organization.id === orgId)?.organization;
  return (
    <ElsewhereView orgName={org?.name ?? 'another organization'} switching={switching || !setActive}
      onSwitch={() => {
        if (!setActive) return;
        setSwitching(true);
        void setActive({ organization: orgId }).then(() => window.location.reload(), () => setSwitching(false));
      }} />
  );
}
