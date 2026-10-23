import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { z } from 'zod';
import { attachProblem, MAX_FILES_PER_TICKET } from '@/lib/attachment-limits';
import { serverI18n } from '@/lib/server-i18n';

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
    // UploadThing only takes powers of two; the real 10 MB / 10-a-ticket limits are checked below (TL-253)
    { blob: { maxFileSize: '16MB', maxFileCount: MAX_FILES_PER_TICKET } },
    { awaitServerData: false },
  )
    .input(uploadTarget)
    .middleware(async ({ input, files }) => {
      const { userId, getToken } = await auth();
      if (!userId) throw new UploadThingError({ code: 'FORBIDDEN', message: 'Sign in to attach files' });
      const token = await getToken();
      const backend = process.env.BACKEND_URL ?? 'http://backend:8080';
      const res = await fetch(new URL(targetPath(input), backend), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
      if (!res?.ok) throw new UploadThingError({ code: 'FORBIDDEN', message: 'You can’t attach files there' });
      // refused before anything is stored: too big, or more than the ticket can hold
      let existing = 0;
      if ('ticketId' in input) {
        const list = await fetch(new URL(`/api/tickets/${input.ticketId}/attachments`, backend), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : []), () => []) as unknown[];
        existing = list.length;
      }
      const problem = attachProblem(await serverI18n(), existing, files);
      if (problem) throw new UploadThingError({ code: 'BAD_REQUEST', message: problem });
      return { userId };
    })
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
