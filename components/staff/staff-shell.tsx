'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { useStaff } from '@/lib/hooks/use-staff';
import { cn } from '@/lib/utils';

export type StaffTab = 'stats' | 'help' | 'mcp-prompt' | 'downtime';

// StaffShell: the admin panel's frame (TL-577), a tab per page. Anyone who isn't staff gets the
// ordinary not-found page, so the panel isn't advertised.
export function StaffShell({ tab, children }: { tab: StaffTab; children: ReactNode }) {
  return <StaffGate staff={useStaff()} tab={tab}>{children}</StaffGate>;
}

export function StaffGate({ staff, tab, children }: { staff: boolean | undefined; tab: StaffTab; children: ReactNode }) {
  if (staff === false) notFound();
  if (staff === undefined) return <main className="mx-auto max-w-6xl px-6 py-10"><p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p></main>;
  return <StaffFrame tab={tab}>{children}</StaffFrame>;
}

export function StaffFrame({ tab, children }: { tab: StaffTab; children: ReactNode }) {
  const { t } = useLingui();
  const tabs: { id: StaffTab; label: ReactNode }[] = [
    { id: 'stats', label: <Trans>Stats</Trans> },
    { id: 'help', label: <Trans>Help answers</Trans> },
    { id: 'mcp-prompt', label: <Trans>MCP pre-prompt</Trans> },
    { id: 'downtime', label: <Trans>Downtime</Trans> },
  ];
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Admin panel</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>For ChewedFeed staff: the whole of TrackLin.es, not one organization.</Trans></p>
      </header>
      <nav aria-label={t`Admin panel`} className="mb-6 inline-flex h-9 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
        {tabs.map((x) => (
          <Link key={x.id} href={`/staff/${x.id}`} aria-current={x.id === tab ? 'page' : undefined}
            className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors hover:text-foreground', x.id === tab && 'bg-background text-foreground shadow-sm')}>
            {x.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
