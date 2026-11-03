'use client';

import { StaffLaunchOffers } from '@/components/staff/launch-offers';
import { StaffShell } from '@/components/staff/staff-shell';

export default function StaffLaunchOfferPage() {
  return <StaffShell tab="launch-offer"><StaffLaunchOffers /></StaffShell>;
}
