'use client';

import { UserButton } from '@clerk/nextjs';
import { SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

// UserMenu is Clerk's account button with our Settings injected, so it's reachable from any page
// (same pattern as ../flags/dashboard HeaderBar/userNav.tsx).
export function UserMenu() {
  const router = useRouter();
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action label="Settings" labelIcon={<SettingsIcon className="size-4" />} onClick={() => router.push('/settings')} />
      </UserButton.MenuItems>
    </UserButton>
  );
}
