'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NameDialog } from '@/components/name-dialog';
import { DEFAULT_TEMPLATE, TemplatePicker } from '@/components/board/template-picker';
import { Button } from '@/components/ui/button';
import { boards } from '@/lib/api';

// NewBoardButton: "New board" and its dialog (name + template); opens the board once made.
export function NewBoardButton({ projectId, token, variant = 'default' }: { projectId: string; token: string; variant?: 'default' | 'outline' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>New board</Button>
      <NameDialog
        open={open}
        onOpenChange={setOpen}
        title="New board"
        description="Start from a template; you can change columns and settings afterwards."
        placeholder="e.g. Backend"
        submitLabel="Create board"
        onSubmit={async (name) => {
          const b = await boards.create(projectId, { name, template_id: template }, token).catch(() => { throw new Error('Couldn’t create the board. Please try again.'); });
          router.push(`/boards/${b.id}`);
        }}
      >
        {open && <TemplatePicker value={template} onChange={setTemplate} token={token} />}
      </NameDialog>
    </>
  );
}
