'use client';

import { StaffShell } from '@/components/staff/staff-shell';
import { StaffStats } from '@/components/staff/stats';

export default function StaffStatsPage() {
  return <StaffShell tab="stats"><StaffStats /></StaffShell>;
}
