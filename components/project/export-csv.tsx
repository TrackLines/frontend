'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportCSV } from '@/lib/api';
import { csvFile } from '@/lib/csv-import';

// ExportCSVButton: every ticket in the project as a CSV file (TL-638): take your data anywhere.
export function ExportCSVButton({ projectId, name, token }: { projectId: string; name: string; token: string }) {
  const { t } = useLingui();
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const url = URL.createObjectURL(new Blob([await exportCSV(projectId, token)], { type: 'text/csv' }));
      Object.assign(document.createElement('a'), { href: url, download: csvFile(name) }).click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert(t`Couldn’t export the tickets. Please try again.`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void download()}>
      <DownloadIcon aria-hidden /><Trans>Export CSV</Trans>
    </Button>
  );
}
