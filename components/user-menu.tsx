'use client';

import { UserButton } from '@clerk/nextjs';
import { useLingui } from '@lingui/react/macro';
import { BellRingIcon, SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

// UserMenu is Clerk's account button with our settings injected: yours (TL-294) and the organization's, so it's reachable from any page
// (same pattern as ../flags/dashboard HeaderBar/userNav.tsx).
export function UserMenu() {
  const router = useRouter();
  const { t } = useLingui();
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action label={t`Your settings`} labelIcon={<BellRingIcon className="size-4" />} onClick={() => router.push('/account')} />
        <UserButton.Action label={t`Organization settings`} labelIcon={<SettingsIcon className="size-4" />} onClick={() => router.push('/settings')} />
      </UserButton.MenuItems>
    </UserButton>
  );
}
