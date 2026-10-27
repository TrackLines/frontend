import { generateReactHelpers } from '@uploadthing/react';
import type { UploadRouter } from '@/app/api/uploadthing/core';

// The upload hook only: the button is ours (components/ticket/attach-files-button.tsx), so it looks
// like the rest of the app instead of UploadThing's prebuilt one.
export const { useUploadThing } = generateReactHelpers<UploadRouter>();
