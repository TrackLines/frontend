'use client';

import { OrganizationSwitcher, useOrganization } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { forgetAllCached } from '@/lib/page-cache';

// OrgSwitcher picks the active organization: projects, boards and roadmaps belong to it, and
// everyone in it sees them. No personal workspace (hidePersonal): every project lives in an org.
export function OrgSwitcher() {
  const { organization } = useOrganization();
  const seen = useRef<string | undefined>(undefined);
  useEffect(() => {
    // pages cached from the previous org must not flash up in this one
    if (seen.current && seen.current !== organization?.id) forgetAllCached();
    seen.current = organization?.id;
  }, [organization?.id]);
  return <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" afterCreateOrganizationUrl="/dashboard" />;
}
