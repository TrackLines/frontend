'use client';

import { useEffect, useState } from 'react';
import { organization } from '@/lib/api';

// useIsAdmin: whether you administer the active organization. null while loading; a failed lookup
// is false, so admin-only controls stay hidden (the server checks again).
export function useIsAdmin(token: string | null): boolean | null {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const loaded = token !== null;
  useEffect(() => {
    if (token) organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false));
  }, [loaded]); // once; token refreshes must not refetch
  return admin;
}
