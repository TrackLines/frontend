import { createRouteHandler } from 'uploadthing/next';
import { uploadRouter } from './core';

// Takes precedence over the app/api/[...path] backend proxy (static segment beats catch-all).
export const { GET, POST } = createRouteHandler({ router: uploadRouter });
