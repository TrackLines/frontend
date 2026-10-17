'use client';

import { useEffect, useState } from 'react';
import { Backlog } from '@/components/project/backlog';
import { Epics } from '@/components/project/epics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Board } from '@/lib/api';

export type WorkTab = 'backlog' | 'epics';

// tabFor: the tab a link opens: /projects/<id>#epics opens Epics; anything else, the Backlog.
export const tabFor = (hash: string): WorkTab => (hash === '#epics' ? 'epics' : 'backlog');

// WorkTabs: the project's Backlog and Epics as tabs, the Backlog open by default (TL-385). The backlog
// stays mounted while Epics is open, so switching back doesn't reload it or lose its filters.
export function WorkTabs({ projectId, boards, token }: { projectId: string; boards: Board[]; token: string }) {
  const [tab, setTab] = useState<WorkTab>('backlog');
  useEffect(() => { setTab(tabFor(window.location.hash)); }, []); // after hydration: the server can't see the hash
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as WorkTab)} className="mt-10 gap-4">
      <TabsList>
        <TabsTrigger value="backlog">Backlog</TabsTrigger>
        <TabsTrigger value="epics">Epics</TabsTrigger>
      </TabsList>
      <TabsContent value="backlog" keepMounted>
        <Backlog projectId={projectId} boards={boards} token={token} />
      </TabsContent>
      <TabsContent value="epics">
        <Epics projectId={projectId} token={token} />
      </TabsContent>
    </Tabs>
  );
}
