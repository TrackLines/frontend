'use client';

import { ImportSettings } from '@/components/settings/import-page';

// the Linear tab of Settings → Import (TL-655), for linking straight to it
export default function LinearImportPage() {
  return <ImportSettings initial="linear" />;
}
