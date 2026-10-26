'use client';

import { ImportSettings } from '@/components/settings/import-page';

// the Jira tab of Settings → Import (TL-653): kept so links to it still work
export default function JiraImportPage() {
  return <ImportSettings initial="jira" />;
}
