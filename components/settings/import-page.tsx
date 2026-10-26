'use client';

import Link from 'next/link';
import { Trans } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CSVImport } from '@/components/settings/csv-import';
import { JiraImport } from '@/components/settings/jira-import';

export type ImportSource = 'csv' | 'jira';

// ImportSettings: Settings → Import, one page with a tab per source (TL-653); more sources are more tabs.
export function ImportSettings({ initial }: { initial: ImportSource }) {
  const { is } = useFlags();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Import</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Bring work in from another tool as new projects. You see what it will make before anything is created, and can scrap it afterwards while nobody has worked on it.</Trans></p>
      </header>
      {is('imports').enabled() ? (
        <Tabs defaultValue={initial} className="min-w-0">
          <TabsList>
            <TabsTrigger value="csv"><Trans>CSV file</Trans></TabsTrigger>
            <TabsTrigger value="jira">Jira</TabsTrigger>
          </TabsList>
          <TabsContent value="csv" className="pt-4">
            <section className="rounded-xl border p-5">
              <p className="mb-5 text-sm text-muted-foreground"><Trans>From Trello, Asana, Linear, a spreadsheet, or another TrackLin.es project’s export: one CSV becomes one project.</Trans></p>
              <CSVImport />
            </section>
          </TabsContent>
          <TabsContent value="jira" className="pt-4">
            <section className="rounded-xl border p-5">
              <p className="mb-5 text-sm text-muted-foreground"><Trans>Each Jira Cloud project becomes a project here, keeping its key and ticket numbers, with its boards, comments and attachments.</Trans></p>
              <JiraImport />
            </section>
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground"><Trans>Importing isn’t turned on for your organization yet.</Trans></p>
      )}
    </main>
  );
}
