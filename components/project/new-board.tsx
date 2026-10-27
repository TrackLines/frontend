'use client';

import { useRouter } from 'next/navigation';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { NameDialog } from '@/components/common/name-dialog';
import { DEFAULT_TEMPLATE, TemplatePicker } from '@/components/board/template-picker';
import { Button } from '@/components/ui/button';
import { boards } from '@/lib/api';

// NewBoardButton: "New board" and its dialog (name + template); opens the board once made. Only
// org admins can make boards, so nobody else sees it (TL-567).
export function NewBoardButton({ projectId, token, admin, variant = 'default' }: { projectId: string; token: string; admin: boolean; variant?: 'default' | 'outline' }) {
  const { t } = useLingui();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  if (!admin) return null;
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}><Trans>New board</Trans></Button>
      <NameDialog
        open={open}
        onOpenChange={setOpen}
        title={t`New board`}
        description={t`Start from a template; you can change columns and settings afterwards.`}
        placeholder={t`e.g. Backend`}
        submitLabel={t`Create board`}
        onSubmit={async (name) => {
          const b = await boards.create(projectId, { name, template_id: template }, token).catch(() => { throw new Error(t`Couldn’t create the board. Please try again.`); });
          router.push(`/boards/${b.id}`);
        }}
      >
        {open && <TemplatePicker value={template} onChange={setTemplate} token={token} />}
      </NameDialog>
    </>
  );
}
