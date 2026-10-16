'use client';

import { UserButton } from '@clerk/nextjs';
import { BellRingIcon, SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

// UserMenu is Clerk's account button with our settings injected: yours (TL-294) and the organization's, so it's reachable from any page
// (same pattern as ../flags/dashboard HeaderBar/userNav.tsx).
export function UserMenu() {
  const router = useRouter();
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action label="Your settings" labelIcon={<BellRingIcon className="size-4" />} onClick={() => router.push('/account')} />
        <UserButton.Action label="Organization settings" labelIcon={<SettingsIcon className="size-4" />} onClick={() => router.push('/settings')} />
      </UserButton.MenuItems>
    </UserButton>
  );
}
