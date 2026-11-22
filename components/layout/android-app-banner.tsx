'use client';

import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=es.tracklin.android';

// Android browsers only; not inside the app's own web views (they carry "; wv)").
export const isAndroidBrowser = (ua: string) => /Android/i.test(ua) && !/; wv\)/.test(ua);

// AndroidAppBanner: a strip above the header pointing Android visitors to the Play Store app, like iOS's
// Smart App Banner. ponytail: dismissal lives in state (the root layout survives client navigation), so a full
// reload shows it again; remembering it needs a storage key, which needs a new privacy policy version (TL-595).
export function AndroidAppBanner() {
  const { t } = useLingui();
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(isAndroidBrowser(navigator.userAgent)), []);
  if (!shown) return null;
  return (
    <div className="flex items-center gap-3 border-b bg-muted px-4 py-2 text-sm print:hidden">
      <Image src="/logo-tile.png" alt="" width={28} height={28} className="size-7 rounded-md" />
      <span className="min-w-0 flex-1"><Trans>TrackLin.es is on Android</Trans></span>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'sm' })}><Trans>Get the app</Trans></a>
      <Button type="button" size="icon-sm" variant="ghost" aria-label={t`Dismiss`} title={t`Dismiss`} onClick={() => setShown(false)}>
        <XIcon />
      </Button>
    </div>
  );
}
