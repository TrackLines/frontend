'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ChatLinkView, linkError, type LinkResult } from '@/components/settings/chat-dm';
import { ApiError, chatApp } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// /chat/link?code=…: where the Tracklines Google Chat app's "Link your Tracklines account" goes
// (TL-289). Signed in (proxy.ts), it links this account to the Google account the code was made for.
export default function ChatLinkPage() {
  return <Suspense><LinkChat /></Suspense>;
}

function LinkChat() {
  const code = useSearchParams().get('code') ?? '';
  const token = useToken();
  const [result, setResult] = useState<LinkResult>(code ? 'linking' : { error: linkError(new ApiError(400, '')) });
  const tried = useRef(false); // codes work once: never send it twice
  useEffect(() => {
    if (!token || !code || tried.current) return;
    tried.current = true;
    chatApp.link(code, token).then(() => setResult('linked'), (err) => setResult({ error: linkError(err) }));
  }, [token !== null]);
  return <ChatLinkView result={result} />;
}
