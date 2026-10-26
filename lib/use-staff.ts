'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { staff } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// asked once per page load: the user menu is on every page, and the answer doesn't change in a visit
let answer: Promise<boolean> | null = null;

// askStaff: the backend decides, behind the admin-panel flag; anyone else, or the flag off, gets 404.
export function askStaff(token: string): Promise<boolean> {
  answer ??= staff.me(token).then((r) => r.staff === true, () => false);
  return answer;
}

// forgetStaff: for tests.
export function forgetStaff() { answer = null; }

// useStaff: is the signed-in person ChewedFeed staff (TL-577)? undefined while asking; signed out is no.
export function useStaff(): boolean | undefined {
  const { isSignedIn } = useAuth();
  const token = useToken();
  const [is, setIs] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (token) void askStaff(token).then(setIs);
  }, [token !== null]);
  return isSignedIn === false ? false : is;
}
