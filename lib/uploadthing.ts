import { generateUploadButton } from '@uploadthing/react';
import type { UploadRouter } from '@/app/api/uploadthing/core';

export const UploadButton = generateUploadButton<UploadRouter>();
