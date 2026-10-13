import { Badge } from '@/components/ui/badge';
import { LIVE_LABEL, type LiveState } from '@/lib/live-status';

// LiveBadge: what the live-updates connection is doing, with a hover note saying what that means.
export function LiveBadge({ state }: { state: LiveState }) {
  const { text, hint } = LIVE_LABEL[state];
  return <Badge variant={state === 'live' ? 'secondary' : 'outline'} role="status" title={hint} aria-description={hint}>{text}</Badge>;
}
