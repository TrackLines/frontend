'use client';

import { useEffect } from 'react';
import { reportClient } from '@/lib/server/report';

// ErrorReporter sends the browser's uncaught errors and unhandled rejections to Bugfixes (TL-292).
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportClient('error', e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportClient('rejection', e.reason, 'Unhandled promise rejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
