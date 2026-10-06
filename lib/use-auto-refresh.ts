'use client';

import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 30_000;

// Refresh shared server state periodically while the page is visible, and as soon
// as the user returns to the tab. Keep the latest callback without restarting
// the timer on every render.
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    let running = false;
    const run = () => {
      if (document.visibilityState === 'hidden' || running) return;
      running = true;
      void Promise.resolve(refreshRef.current()).finally(() => {
        running = false;
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run();
    };

    const timer = window.setInterval(run, intervalMs);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
