'use client';

import { useEffect } from 'react';
import { invitations } from '@/lib/api';
import { completeInvitations } from '@/lib/complete-invitations';
import { useToken } from '@/lib/use-token';

// CompleteInvitations: once per sign-in, finishes the invitations you've accepted in Clerk (TL-240).
export function CompleteInvitations() {
  const token = useToken();
  const signedIn = token !== null;
  useEffect(() => {
    if (!token) return;
    invitations.mine(token).then((mine) => completeInvitations(mine, (id) => invitations.accept(id, token)), () => {});
  }, [signedIn]); // token refreshes must not re-run it
  return null;
}
