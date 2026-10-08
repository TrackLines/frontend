'use client';

import { OrganizationSwitcher, useOrganization } from '@clerk/nextjs';
import { useFlags } from '@flags-gg/react-library';
import { useEffect, useRef } from 'react';
import { forgetAllCached } from '@/lib/page-cache';

// OrgSwitcher picks the active organization: projects, boards and roadmaps belong to it, and
// everyone in it sees them. No personal workspace (hidePersonal): every project lives in an org.
export function OrgSwitcher() {
  const { organization } = useOrganization();
  const { is } = useFlags();
  const seen = useRef<string | undefined>(undefined);
  useEffect(() => {
    // pages cached from the previous org must not flash up in this one
    if (seen.current && seen.current !== organization?.id) forgetAllCached();
    seen.current = organization?.id;
  }, [organization?.id]);
  if (is('org-switcher').disabled()) return null; // flags.gg; off = stay in the active org
  return <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" afterCreateOrganizationUrl="/dashboard" />;
}
