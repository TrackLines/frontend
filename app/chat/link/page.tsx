'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ChatLinkView, linkError, type LinkResult } from '@/components/settings/chat-dm';
import { ApiError, chatApp } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// /chat/link?code=…: where the Tracklines Google Chat app's "Link your Tracklines account" goes
// (TL-289). Signed in (proxy.ts), it asks before linking this account to the Google account the code was made for.
export default function ChatLinkPage() {
  return <Suspense><LinkChat /></Suspense>;
}

function LinkChat() {
  const code = useSearchParams().get('code') ?? '';
  const token = useToken();
  const [result, setResult] = useState<LinkResult>(code ? 'checking' : { error: linkError(new ApiError(400, '')) });
  const tried = useRef(false); // codes work once: never send it twice
  useEffect(() => { // ask which Google account first; linking waits for a click
    if (!token || !code) return;
    chatApp.linkCode(code, token).then((r) => setResult({ confirm: r.google }), (err) => setResult({ error: linkError(err) }));
  }, [token !== null]);
  const confirm = () => {
    if (!token || tried.current) return;
    tried.current = true;
    setResult('linking');
    chatApp.link(code, token).then(() => setResult('linked'), (err) => setResult({ error: linkError(err) }));
  };
  return <ChatLinkView result={result} onConfirm={confirm} />;
}
