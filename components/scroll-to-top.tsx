'use client';

import { useEffect, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// SHOW_AFTER: how far down (px) before the button appears: about a screen, so short pages never show it.
export const SHOW_AFTER = 600;

export const shouldShow = (scrollY: number) => scrollY > SHOW_AFTER;

// ScrollToTop: a "back to top" button, bottom-right (toasts and the live pill are bottom-left), shown
// only once you've scrolled down a long page (TL-412).
export function ScrollToTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(shouldShow(window.scrollY));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!shown) return null;
  return (
    <Button type="button" size="icon" variant="outline" aria-label="Scroll to top" title="Scroll to top"
      className="fixed right-4 bottom-4 z-40 rounded-full shadow-md print:hidden"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
      <ArrowUpIcon />
    </Button>
  );
}
