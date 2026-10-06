import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

const f = createUploadthing();

// Browser → UploadThing upload for ticket attachments. Only signed-in users get a presigned URL.
// The browser then records the file on the ticket via the backend (POST /api/tickets/{id}/attachments),
// so nothing here depends on UploadThing reaching this server's callback (it can't on localhost).
export const uploadRouter = {
  ticketAttachment: f(
    { blob: { maxFileSize: '16MB', maxFileCount: 10 } },
    { awaitServerData: false },
  )
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new UploadThingError({ code: 'FORBIDDEN', message: 'Sign in to attach files' });
      return { userId };
    })
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
