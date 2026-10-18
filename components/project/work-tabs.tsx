'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Backlog } from '@/components/project/backlog';
import { Epics } from '@/components/project/epics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Board } from '@/lib/api';

export type WorkTab = 'backlog' | 'epics' | 'roadmaps';

// tabFor: the tab a link opens: /projects/<id>#epics opens Epics, #roadmaps Roadmaps; anything else, the Backlog.
export const tabFor = (hash: string): WorkTab => (hash === '#epics' ? 'epics' : hash === '#roadmaps' ? 'roadmaps' : 'backlog');

// WorkTabs: the project's Backlog, Epics and Roadmaps as tabs, the Backlog open by default (TL-385). Every
// panel stays mounted, so switching tabs never refetches or blanks one (TL-395), and the backlog keeps its filters.
// roadmaps: the page's roadmap list, which it keeps (new roadmaps are added there).
export function WorkTabs({ projectId, boards, token, roadmaps }: { projectId: string; boards: Board[]; token: string; roadmaps: ReactNode }) {
  const [tab, setTab] = useState<WorkTab>('backlog');
  useEffect(() => { setTab(tabFor(window.location.hash)); }, []); // after hydration: the server can't see the hash
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as WorkTab)} className="mt-10 gap-4">
      <TabsList>
        <TabsTrigger value="backlog">Backlog</TabsTrigger>
        <TabsTrigger value="epics">Epics</TabsTrigger>
        <TabsTrigger value="roadmaps">Roadmaps</TabsTrigger>
      </TabsList>
      <TabsContent value="backlog" keepMounted>
        <Backlog projectId={projectId} boards={boards} token={token} />
      </TabsContent>
      <TabsContent value="epics" keepMounted>
        <Epics projectId={projectId} token={token} active={tab === 'epics'} />
      </TabsContent>
      <TabsContent value="roadmaps" id="roadmaps" keepMounted>{roadmaps}</TabsContent>
    </Tabs>
  );
}
