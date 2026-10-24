'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChartColumnIcon } from 'lucide-react';
import { SettingsCard } from '@/components/settings/settings-card';
import { buttonVariants } from '@/components/ui/button';

// The ways into sprint reports (TL-400). A board's is in its Past sprints (ReportLink); these are a
// project's and, for org admins, the organization's.

export function ProjectReportLink({ projectId }: { projectId: string }) {
  return <Link href={`/reports?project=${projectId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><ChartColumnIcon /><Trans>Sprint report</Trans></Link>;
}

export function OrgReportCard() {
  const { t } = useLingui();
  return <SettingsCard icon={ChartColumnIcon} title={t`Sprint report`} href="/reports?org=1" description={t`How every project’s sprints went, to share with leadership.`} />;
}
