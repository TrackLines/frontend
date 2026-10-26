'use client';

import { HelpEditor } from '@/components/staff/help-editor';
import { StaffShell } from '@/components/staff/staff-shell';

export default function StaffHelpPage() {
  return <StaffShell tab="help"><HelpEditor /></StaffShell>;
}
