import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { z } from 'zod';

const f = createUploadthing();

// uploadTarget: what the files are for. An existing ticket, or (while creating one) its project.
export const uploadTarget = z.union([
  z.object({ ticketId: z.string().uuid() }),
  z.object({ projectId: z.string().uuid() }),
]);
export type UploadTarget = z.infer<typeof uploadTarget>;

// targetPath is the backend read that proves the uploader can see the target (in their active org).
export function targetPath(t: UploadTarget): string {
  return 'ticketId' in t ? `/api/tickets/${t.ticketId}` : `/api/projects/${t.projectId}`;
}

// Browser → UploadThing upload for ticket attachments. A presigned URL is only given to a signed-in
// user who can see the ticket (or, while creating one, the project) it's for: asked of the backend
// with their own token, so storage isn't open to any account. The browser then records the file on
// the ticket via the backend (POST /api/tickets/{id}/attachments), so nothing here depends on
// UploadThing reaching this server's callback (it can't on localhost).
export const uploadRouter = {
  ticketAttachment: f(
    { blob: { maxFileSize: '16MB', maxFileCount: 10 } },
    { awaitServerData: false },
  )
    .input(uploadTarget)
    .middleware(async ({ input }) => {
      const { userId, getToken } = await auth();
      if (!userId) throw new UploadThingError({ code: 'FORBIDDEN', message: 'Sign in to attach files' });
      const token = await getToken();
      const backend = process.env.BACKEND_URL ?? 'http://backend:8080';
      const res = await fetch(new URL(targetPath(input), backend), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
      if (!res?.ok) throw new UploadThingError({ code: 'FORBIDDEN', message: 'You can’t attach files there' });
      return { userId };
    })
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
