'use client';

import { UserButton } from '@clerk/nextjs';
import { useLingui } from '@lingui/react/macro';
import { BellRingIcon, SettingsIcon, ShieldIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStaff } from '@/lib/hooks/use-staff';

// UserMenu is Clerk's account button with our settings injected: yours (TL-294) and the organization's, so it's reachable from any page
// (same pattern as ../flags/dashboard HeaderBar/userNav.tsx), and the admin panel for ChewedFeed staff (TL-577).
export function UserMenu() {
  const router = useRouter();
  const { t } = useLingui();
  const staff = useStaff();
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action label={t`Your settings`} labelIcon={<BellRingIcon className="size-4" />} onClick={() => router.push('/account')} />
        <UserButton.Action label={t`Organization settings`} labelIcon={<SettingsIcon className="size-4" />} onClick={() => router.push('/settings')} />
        {staff && <UserButton.Action label={t`Admin panel`} labelIcon={<ShieldIcon className="size-4" />} onClick={() => router.push('/staff')} />}
      </UserButton.MenuItems>
    </UserButton>
  );
}
