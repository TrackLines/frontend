'use client';

import { Trans } from '@lingui/react/macro';
import { useEffect } from 'react';
import { I18n } from '@/components/layout/i18n-provider';
import { reportClient } from '@/lib/server/report';

// The root layout itself crashed: reported to Bugfixes (TL-292). It replaces the whole page, so it
// brings its own html and body, without the app's styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClient('boundary', error); }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '64px auto', padding: '0 24px' }}>
        <I18n>
          <h1><Trans>Something went wrong</Trans></h1>
          <p><Trans>We’ve been told about it.</Trans></p>
          <button type="button" onClick={reset}><Trans>Try again</Trans></button>
        </I18n>
      </body>
    </html>
  );
}
