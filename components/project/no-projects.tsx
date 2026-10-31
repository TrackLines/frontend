'use client';

import { Trans } from '@lingui/react/macro';
import { FolderKanbanIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// NoProjects: the dashboard with no projects yet. Only org admins can create one (TL-735), so everyone
// else is told who can. onCreate null: not an admin, or not known to be yet.
export function NoProjects({ onCreate }: { onCreate: (() => void) | null }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <FolderKanbanIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
      {onCreate ? (
        <>
          <h2 className="mt-4 text-lg font-semibold"><Trans>Start your first project</Trans></h2>
          <p className="mx-auto mt-1 mb-6 max-w-md text-sm text-muted-foreground"><Trans>A project holds a board for each team, a shared backlog, and the roadmaps you send to customers.</Trans></p>
          <Button onClick={onCreate}><Trans>Create a project</Trans></Button>
        </>
      ) : (
        <>
          <h2 className="mt-4 text-lg font-semibold"><Trans>No projects yet</Trans></h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground"><Trans>Your organization’s admins can create projects. They’ll appear here.</Trans></p>
        </>
      )}
    </div>
  );
}
