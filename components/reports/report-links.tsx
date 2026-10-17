'use client';

import Link from 'next/link';
import { useFlags } from '@flags-gg/react-library';
import { ChartColumnIcon } from 'lucide-react';
import { SettingsCard } from '@/components/settings/settings-card';
import { buttonVariants } from '@/components/ui/button';

// The ways into sprint reports (TL-400), while the sprint-reports flag is on. A board's is in its
// Past sprints (ReportLink); these are a project's and, for org admins, the organization's.

export function ProjectReportLink({ projectId }: { projectId: string }) {
  const { is } = useFlags();
  if (is('sprint-reports').disabled()) return null;
  return <Link href={`/reports?project=${projectId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><ChartColumnIcon />Sprint report</Link>;
}

export function OrgReportCard() {
  const { is } = useFlags();
  if (is('sprint-reports').disabled()) return null;
  return <SettingsCard icon={ChartColumnIcon} title="Sprint report" href="/reports?org=1" description="How every project’s sprints went, to share with leadership." />;
}
