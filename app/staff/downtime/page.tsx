'use client';

import { StaffDowntime } from '@/components/staff/downtime';
import { StaffShell } from '@/components/staff/staff-shell';

export default function StaffDowntimePage() {
  return <StaffShell tab="downtime"><StaffDowntime /></StaffShell>;
}
